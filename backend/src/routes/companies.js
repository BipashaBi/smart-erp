const express = require("express");
const pool = require("../db");

const router = express.Router();
const MAX_COMPANIES = 5;

router.get("/", async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM companies WHERE user_id = $1 ORDER BY id",
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const { name, address = "", state = "", gstin = "", phone = "", financial_year = "" } = req.body || {};
    if (!name || !name.trim()) return res.status(400).json({ error: "Company name is required." });

    const count = await pool.query("SELECT COUNT(*)::int AS n FROM companies WHERE user_id = $1", [req.user.id]);
    if (count.rows[0].n >= MAX_COMPANIES) {
      return res.status(400).json({ error: `Limit reached: an account can manage up to ${MAX_COMPANIES} companies.` });
    }

    const { rows } = await pool.query(
      `INSERT INTO companies (user_id, name, address, state, gstin, phone, financial_year)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [req.user.id, name.trim(), address, state, gstin, phone, financial_year]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

router.put("/:id", async (req, res, next) => {
  try {
    const { name, address = "", state = "", gstin = "", phone = "", financial_year = "" } = req.body || {};
    if (!name || !name.trim()) return res.status(400).json({ error: "Company name is required." });
    const { rows } = await pool.query(
      `UPDATE companies SET name = $1, address = $2, state = $3, gstin = $4, phone = $5, financial_year = $6
       WHERE id = $7 AND user_id = $8 RETURNING *`,
      [name.trim(), address, state, gstin, phone, financial_year, req.params.id, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: "Company not found." });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const { rowCount } = await pool.query(
      "DELETE FROM companies WHERE id = $1 AND user_id = $2",
      [req.params.id, req.user.id]
    );
    if (!rowCount) return res.status(404).json({ error: "Company not found." });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
