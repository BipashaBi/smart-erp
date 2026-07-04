const jwt = require("jsonwebtoken");
const pool = require("../db");

// Verifies the JWT and puts { id, email } on req.user
function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Login required." });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Session expired. Log in again." });
  }
}

// Requires an x-company-id header that belongs to the logged-in user.
async function requireCompany(req, res, next) {
  const companyId = parseInt(req.headers["x-company-id"], 10);
  if (!companyId) return res.status(400).json({ error: "Select a company first." });
  try {
    const { rows } = await pool.query(
      "SELECT id FROM companies WHERE id = $1 AND user_id = $2",
      [companyId, req.user.id]
    );
    if (!rows.length) return res.status(403).json({ error: "Company not found." });
    req.companyId = companyId;
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { requireAuth, requireCompany };
