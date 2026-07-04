require("dotenv").config();
const express = require("express");
const cors = require("cors");

const { requireAuth, requireCompany } = require("./middleware/auth");
const authRoutes = require("./routes/auth");
const companyRoutes = require("./routes/companies");
const ledgerRoutes = require("./routes/ledgers");
const stockRoutes = require("./routes/stock");
const voucherRoutes = require("./routes/vouchers");
const reportRoutes = require("./routes/reports");

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
app.use(express.json());

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);
app.use("/api/companies", requireAuth, companyRoutes);
app.use("/api/ledgers", requireAuth, requireCompany, ledgerRoutes);
app.use("/api/stock", requireAuth, requireCompany, stockRoutes);
app.use("/api/vouchers", requireAuth, requireCompany, voucherRoutes);
app.use("/api/reports", requireAuth, requireCompany, reportRoutes);

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Something went wrong on the server." });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`SmartERP API listening on :${PORT}`));
