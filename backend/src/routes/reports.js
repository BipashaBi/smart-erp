const express = require("express");
const pool = require("../db");

const router = express.Router();

// Stock summary: quantity + valuation (qty x purchase price)
router.get("/stock-summary", async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT s.id, s.name, s.sku, u.name AS unit, s.quantity, s.purchase_price, s.selling_price,
              ROUND(s.quantity * s.purchase_price, 2) AS valuation
       FROM stock_items s LEFT JOIN units u ON u.id = s.unit_id
       WHERE s.company_id = $1 ORDER BY s.name`,
      [req.companyId]
    );
    const totalValuation = rows.reduce((a, r) => a + Number(r.valuation), 0);
    res.json({ items: rows, total_valuation: Math.round(totalValuation * 100) / 100 });
  } catch (err) {
    next(err);
  }
});

// Outstanding: receivables (customers) and payables (suppliers)
router.get("/outstanding", async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, type, name, phone, balance FROM ledgers
       WHERE company_id = $1 AND balance <> 0 ORDER BY type, balance DESC`,
      [req.companyId]
    );
    const receivables = rows.filter((r) => r.type === "customer");
    const payables = rows.filter((r) => r.type === "supplier");
    const sum = (list) => Math.round(list.reduce((a, r) => a + Number(r.balance), 0) * 100) / 100;
    res.json({
      receivables,
      payables,
      total_receivable: sum(receivables),
      total_payable: sum(payables),
    });
  } catch (err) {
    next(err);
  }
});

// Sales / purchase register with day totals
router.get("/register", async (req, res, next) => {
  try {
    const type = req.query.type === "purchase" ? "purchase" : "sales";
    const { rows } = await pool.query(
      `SELECT v.voucher_date, COUNT(*)::int AS voucher_count,
              SUM(v.subtotal) AS subtotal, SUM(v.gst_amount) AS gst_amount, SUM(v.total) AS total
       FROM vouchers v
       WHERE v.company_id = $1 AND v.type = $2
       GROUP BY v.voucher_date ORDER BY v.voucher_date DESC`,
      [req.companyId, type]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
