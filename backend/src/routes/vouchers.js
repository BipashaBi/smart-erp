const express = require("express");
const pool = require("../db");
const { streamInvoicePdf } = require("../utils/invoicePdf");

const router = express.Router();

const PREFIX = { sales: "INV", purchase: "PUR" };

// GET /api/vouchers?type=sales|purchase  (day book / registers)
router.get("/", async (req, res, next) => {
  try {
    const { type } = req.query;
    const params = [req.companyId];
    let sql = `SELECT v.*, l.name AS party_name
               FROM vouchers v JOIN ledgers l ON l.id = v.party_ledger_id
               WHERE v.company_id = $1`;
    if (type === "sales" || type === "purchase") {
      params.push(type);
      sql += ` AND v.type = $${params.length}`;
    }
    sql += " ORDER BY v.voucher_date DESC, v.id DESC";
    const { rows } = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const voucher = await getVoucherFull(req.params.id, req.companyId);
    if (!voucher) return res.status(404).json({ error: "Voucher not found." });
    res.json(voucher);
  } catch (err) {
    next(err);
  }
});

// GET /api/vouchers/:id/invoice.pdf  (sales invoice)
router.get("/:id/invoice.pdf", async (req, res, next) => {
  try {
    const voucher = await getVoucherFull(req.params.id, req.companyId);
    if (!voucher) return res.status(404).json({ error: "Voucher not found." });
    const company = await pool.query("SELECT * FROM companies WHERE id = $1", [req.companyId]);
    streamInvoicePdf(res, { company: company.rows[0], voucher });
  } catch (err) {
    next(err);
  }
});

// POST /api/vouchers
// body: { type, party_ledger_id, voucher_date?, notes?, items: [{ stock_item_id, quantity, rate }] }
// Sales: stock down, customer balance up. Purchase: stock up, supplier balance up.
router.post("/", async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { type, party_ledger_id, voucher_date, notes = "", items } = req.body || {};
    if (!["sales", "purchase"].includes(type)) return res.status(400).json({ error: "Type must be sales or purchase." });
    if (!party_ledger_id) return res.status(400).json({ error: "Select a party." });
    if (!Array.isArray(items) || !items.length) return res.status(400).json({ error: "Add at least one item." });

    await client.query("BEGIN");

    // Serialize voucher numbering per company
    await client.query("SELECT id FROM companies WHERE id = $1 FOR UPDATE", [req.companyId]);

    const expectedPartyType = type === "sales" ? "customer" : "supplier";
    const party = await client.query(
      "SELECT * FROM ledgers WHERE id = $1 AND company_id = $2 AND type = $3",
      [party_ledger_id, req.companyId, expectedPartyType]
    );
    if (!party.rows.length) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: `Party must be a ${expectedPartyType} ledger of this company.` });
    }

    // Validate lines and compute totals
    let subtotal = 0;
    let gstTotal = 0;
    const lines = [];
    for (const raw of items) {
      const qty = Number(raw.quantity);
      const rate = Number(raw.rate);
      if (!raw.stock_item_id || !(qty > 0) || !(rate >= 0)) {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: "Every line needs an item, a quantity above 0, and a rate." });
      }
      const item = await client.query(
        "SELECT * FROM stock_items WHERE id = $1 AND company_id = $2 FOR UPDATE",
        [raw.stock_item_id, req.companyId]
      );
      if (!item.rows.length) {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: "Item not found in this company." });
      }
      const stock = item.rows[0];
      if (type === "sales" && Number(stock.quantity) < qty) {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: `Not enough stock of ${stock.name}: ${stock.quantity} available, ${qty} requested.` });
      }
      const amount = round2(qty * rate);
      const gstAmount = round2((amount * Number(stock.gst_percent)) / 100);
      subtotal = round2(subtotal + amount);
      gstTotal = round2(gstTotal + gstAmount);
      lines.push({ stock, qty, rate, amount, gstAmount, gstPercent: Number(stock.gst_percent) });
    }
    const total = round2(subtotal + gstTotal);

    // Next voucher number for this company + type
    const seqRes = await client.query(
      "SELECT COALESCE(MAX(voucher_seq), 0) + 1 AS seq FROM vouchers WHERE company_id = $1 AND type = $2",
      [req.companyId, type]
    );
    const seq = seqRes.rows[0].seq;
    const voucherNo = `${PREFIX[type]}-${String(seq).padStart(4, "0")}`;

    const vRes = await client.query(
      `INSERT INTO vouchers (company_id, type, voucher_seq, voucher_no, party_ledger_id, voucher_date, subtotal, gst_amount, total, notes)
       VALUES ($1, $2, $3, $4, $5, COALESCE($6, CURRENT_DATE), $7, $8, $9, $10) RETURNING *`,
      [req.companyId, type, seq, voucherNo, party_ledger_id, voucher_date || null, subtotal, gstTotal, total, notes]
    );
    const voucher = vRes.rows[0];

    for (const line of lines) {
      await client.query(
        `INSERT INTO voucher_items (voucher_id, stock_item_id, quantity, rate, gst_percent, amount, gst_amount)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [voucher.id, line.stock.id, line.qty, line.rate, line.gstPercent, line.amount, line.gstAmount]
      );
      const delta = type === "sales" ? -line.qty : line.qty;
      await client.query("UPDATE stock_items SET quantity = quantity + $1 WHERE id = $2", [delta, line.stock.id]);
    }

    // Party owes more (customer) / we owe more (supplier)
    await client.query("UPDATE ledgers SET balance = balance + $1 WHERE id = $2", [total, party_ledger_id]);

    await client.query("COMMIT");
    res.status(201).json(voucher);
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    next(err);
  } finally {
    client.release();
  }
});

async function getVoucherFull(id, companyId) {
  const v = await pool.query(
    `SELECT v.*, l.name AS party_name, l.address AS party_address, l.gstin AS party_gstin, l.phone AS party_phone
     FROM vouchers v JOIN ledgers l ON l.id = v.party_ledger_id
     WHERE v.id = $1 AND v.company_id = $2`,
    [id, companyId]
  );
  if (!v.rows.length) return null;
  const items = await pool.query(
    `SELECT vi.*, s.name AS item_name, s.sku, u.name AS unit
     FROM voucher_items vi
     JOIN stock_items s ON s.id = vi.stock_item_id
     LEFT JOIN units u ON u.id = s.unit_id
     WHERE vi.voucher_id = $1 ORDER BY vi.id`,
    [id]
  );
  return { ...v.rows[0], items: items.rows };
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

module.exports = router;
