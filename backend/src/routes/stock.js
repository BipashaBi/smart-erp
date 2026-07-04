const express = require("express");
const pool = require("../db");

const router = express.Router();

// ---- Units ----
router.get("/units", async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM units WHERE company_id = $1 ORDER BY name",
      [req.companyId]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.post("/units", async (req, res, next) => {
  try {
    const name = (req.body?.name || "").trim().toUpperCase();
    if (!name) return res.status(400).json({ error: "Unit name is required (e.g. PCS, KG, BOX)." });
    const { rows } = await pool.query(
      "INSERT INTO units (company_id, name) VALUES ($1, $2) RETURNING *",
      [req.companyId, name]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ error: "This unit already exists." });
    next(err);
  }
});

// ---- Stock items ----
router.get("/items", async (req, res, next) => {
  try {
    const { search } = req.query;
    const params = [req.companyId];
    let sql = `SELECT s.*, u.name AS unit
               FROM stock_items s LEFT JOIN units u ON u.id = s.unit_id
               WHERE s.company_id = $1`;
    if (search) {
      params.push(`%${search}%`);
      sql += ` AND (s.name ILIKE $${params.length} OR s.sku ILIKE $${params.length})`;
    }
    sql += " ORDER BY s.name";
    const { rows } = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.post("/items", async (req, res, next) => {
  try {
    const {
      name, sku = "", unit_id = null,
      purchase_price = 0, selling_price = 0, gst_percent = 0, quantity = 0,
    } = req.body || {};
    if (!name || !name.trim()) return res.status(400).json({ error: "Item name is required." });
    const { rows } = await pool.query(
      `INSERT INTO stock_items (company_id, name, sku, unit_id, purchase_price, selling_price, gst_percent, quantity)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [req.companyId, name.trim(), sku, unit_id || null,
       Number(purchase_price) || 0, Number(selling_price) || 0,
       Number(gst_percent) || 0, Number(quantity) || 0]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ error: "An item with this name already exists." });
    next(err);
  }
});

router.put("/items/:id", async (req, res, next) => {
  try {
    const { name, sku = "", unit_id = null, purchase_price = 0, selling_price = 0, gst_percent = 0 } = req.body || {};
    if (!name || !name.trim()) return res.status(400).json({ error: "Item name is required." });
    const { rows } = await pool.query(
      `UPDATE stock_items SET name = $1, sku = $2, unit_id = $3, purchase_price = $4, selling_price = $5, gst_percent = $6
       WHERE id = $7 AND company_id = $8 RETURNING *`,
      [name.trim(), sku, unit_id || null, Number(purchase_price) || 0,
       Number(selling_price) || 0, Number(gst_percent) || 0, req.params.id, req.companyId]
    );
    if (!rows.length) return res.status(404).json({ error: "Item not found." });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

router.delete("/items/:id", async (req, res, next) => {
  try {
    const used = await pool.query("SELECT 1 FROM voucher_items WHERE stock_item_id = $1 LIMIT 1", [req.params.id]);
    if (used.rows.length) return res.status(400).json({ error: "This item appears in vouchers and can't be deleted." });
    const { rowCount } = await pool.query(
      "DELETE FROM stock_items WHERE id = $1 AND company_id = $2",
      [req.params.id, req.companyId]
    );
    if (!rowCount) return res.status(404).json({ error: "Item not found." });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
