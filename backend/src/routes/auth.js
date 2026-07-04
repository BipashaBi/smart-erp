const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../db");

const router = express.Router();

function sign(user) {
  return jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
}

router.post("/register", async (req, res, next) => {
  try {
    const { name, email, password } = req.body || {};
    if (!name || !email || !password || password.length < 6) {
      return res.status(400).json({ error: "Name, email and a password of 6+ characters are required." });
    }
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      "INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email",
      [name.trim(), email.trim().toLowerCase(), hash]
    );
    res.status(201).json({ token: sign(rows[0]), user: rows[0] });
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ error: "An account with this email already exists." });
    next(err);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    const { rows } = await pool.query("SELECT * FROM users WHERE email = $1", [
      (email || "").trim().toLowerCase(),
    ]);
    const user = rows[0];
    if (!user || !(await bcrypt.compare(password || "", user.password_hash))) {
      return res.status(401).json({ error: "Incorrect email or password." });
    }
    res.json({ token: sign(user), user: { id: user.id, name: user.name, email: user.email } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
