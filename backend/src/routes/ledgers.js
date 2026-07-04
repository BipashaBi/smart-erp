const express = require("express");
const pool = require("../db");

const router = express.Router();

// GET /api/ledgers?type=customer|supplier&search=
router.get("/", async (req, res, next) => {
  try {
    const { type, search } = req.query;
    const params = [req.companyId];
    let sql = "SELECT * FROM ledgers WHERE company_id = $1";
    if (type === "customer" || type === "supplier") {
      params.push(type);
      sql += ` AND type = $${params.length}`;
    }
    if (search) {
      params.push(`%${search}%`);
      sql += ` AND name ILIKE $${params.length}`;
    }
    sql += " ORDER BY name";
    const { rows } = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const { type, name, phone = "", address = "", gstin = "", opening_balance = 0 } = req.body || {};
    if (!["customer", "supplier"].includes(type)) return res.status(400).json({ error: "Type must be customer or supplier." });
    if (!name || !name.trim()) return res.status(400).json({ error: "Ledger name is required." });
    const ob = Number(opening_balance) || 0;
    const { rows } = await pool.query(
      `INSERT INTO ledgers (company_id, type, name, phone, address, gstin, opening_balance, balance)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $7) RETURNING *`,
      [req.companyId, type, name.trim(), phone, address, gstin, ob]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ error: "A ledger with this name already exists." });
    next(err);
  }
});

router.put("/:id", async (req, res, next) => {
  try {
    const { name, phone = "", address = "", gstin = "" } = req.body || {};
    if (!name || !name.trim()) return res.status(400).json({ error: "Ledger name is required." });
    const { rows } = await pool.query(
      `UPDATE ledgers SET name = $1, phone = $2, address = $3, gstin = $4
       WHERE id = $5 AND company_id = $6 RETURNING *`,
      [name.trim(), phone, address, gstin, req.params.id, req.companyId]
    );
    if (!rows.length) return res.status(404).json({ error: "Ledger not found." });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const used = await pool.query(
      "SELECT 1 FROM vouchers WHERE party_ledger_id = $1 AND company_id = $2 LIMIT 1",
      [req.params.id, req.companyId]
    );
    if (used.rows.length) return res.status(400).json({ error: "This ledger has vouchers and can't be deleted." });
    const { rowCount } = await pool.query(
      "DELETE FROM ledgers WHERE id = $1 AND company_id = $2",
      [req.params.id, req.companyId]
    );
    if (!rowCount) return res.status(404).json({ error: "Ledger not found." });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// Ledger statement: the party's vouchers plus running context
router.get("/:id/statement", async (req, res, next) => {
  try {
    const ledger = await pool.query(
      "SELECT * FROM ledgers WHERE id = $1 AND company_id = $2",
      [req.params.id, req.companyId]
    );
    if (!ledger.rows.length) return res.status(404).json({ error: "Ledger not found." });
    const vouchers = await pool.query(
      `SELECT id, type, voucher_no, voucher_date, subtotal, gst_amount, total
       FROM vouchers WHERE party_ledger_id = $1 AND company_id = $2
       ORDER BY voucher_date, id`,
      [req.params.id, req.companyId]
    );
    res.json({ ledger: ledger.rows[0], vouchers: vouchers.rows });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
