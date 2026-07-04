-- SmartERP MVP schema
-- Run once: psql $DATABASE_URL -f src/schema.sql

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS companies (
  id             SERIAL PRIMARY KEY,
  user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  address        TEXT DEFAULT '',
  state          TEXT DEFAULT '',
  gstin          TEXT DEFAULT '',
  phone          TEXT DEFAULT '',
  financial_year TEXT DEFAULT '',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Customer / supplier ledgers. balance semantics:
--   customer: amount the customer owes us (receivable)
--   supplier: amount we owe the supplier (payable)
CREATE TABLE IF NOT EXISTS ledgers (
  id              SERIAL PRIMARY KEY,
  company_id      INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  type            TEXT NOT NULL CHECK (type IN ('customer','supplier')),
  name            TEXT NOT NULL,
  phone           TEXT DEFAULT '',
  address         TEXT DEFAULT '',
  gstin           TEXT DEFAULT '',
  opening_balance NUMERIC(14,2) NOT NULL DEFAULT 0,
  balance         NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, type, name)
);

CREATE TABLE IF NOT EXISTS units (
  id         SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  UNIQUE (company_id, name)
);

CREATE TABLE IF NOT EXISTS stock_items (
  id             SERIAL PRIMARY KEY,
  company_id     INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  sku            TEXT DEFAULT '',
  unit_id        INTEGER REFERENCES units(id) ON DELETE SET NULL,
  purchase_price NUMERIC(14,2) NOT NULL DEFAULT 0,
  selling_price  NUMERIC(14,2) NOT NULL DEFAULT 0,
  gst_percent    NUMERIC(5,2)  NOT NULL DEFAULT 0,
  quantity       NUMERIC(14,3) NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, name)
);

CREATE TABLE IF NOT EXISTS vouchers (
  id              SERIAL PRIMARY KEY,
  company_id      INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  type            TEXT NOT NULL CHECK (type IN ('sales','purchase')),
  voucher_seq     INTEGER NOT NULL,
  voucher_no      TEXT NOT NULL,
  party_ledger_id INTEGER NOT NULL REFERENCES ledgers(id),
  voucher_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  subtotal        NUMERIC(14,2) NOT NULL,
  gst_amount      NUMERIC(14,2) NOT NULL,
  total           NUMERIC(14,2) NOT NULL,
  notes           TEXT DEFAULT '',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, type, voucher_seq)
);

CREATE TABLE IF NOT EXISTS voucher_items (
  id            SERIAL PRIMARY KEY,
  voucher_id    INTEGER NOT NULL REFERENCES vouchers(id) ON DELETE CASCADE,
  stock_item_id INTEGER NOT NULL REFERENCES stock_items(id),
  quantity      NUMERIC(14,3) NOT NULL,
  rate          NUMERIC(14,2) NOT NULL,
  gst_percent   NUMERIC(5,2)  NOT NULL,
  amount        NUMERIC(14,2) NOT NULL,
  gst_amount    NUMERIC(14,2) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ledgers_company  ON ledgers(company_id, type);
CREATE INDEX IF NOT EXISTS idx_items_company    ON stock_items(company_id);
CREATE INDEX IF NOT EXISTS idx_vouchers_company ON vouchers(company_id, type, voucher_date);
CREATE INDEX IF NOT EXISTS idx_vitems_voucher   ON voucher_items(voucher_id);
