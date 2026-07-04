# SmartERP — Billing, Inventory & Accounting (Tally-inspired)

A keyboard-first web ERP. MVP scope as per the project brief:

- **Ledgers** — customer, supplier, stock item (with units)
- **Vouchers** — sales (customer bill) and purchase (stock entry)
- Auth (JWT) + up to **5 companies** per account
- Automatic effects: sales → stock ↓, customer receivable ↑ · purchase → stock ↑, supplier payable ↑
- Auto voucher numbering (INV-0001 / PUR-0001), GST calculation (CGST/SGST split on invoice)
- Invoice **PDF** (PDFKit), ledger statements, day book
- Reports: stock summary + valuation, low-stock highlight, outstanding (receivables/payables), sales/purchase registers
- **Keyboard shortcuts** everywhere: F1 companies, F8 sales, F9 purchase, Alt+L ledgers, Alt+S stock, Alt+D day book, Alt+R reports, Ctrl+H gateway, Ctrl+Q logout, Esc back

Stack: Next.js + Tailwind · Node.js + Express · PostgreSQL · JWT · PDFKit.

## Run locally

Prereqs: Node 18+, PostgreSQL.

### 1. Backend

```bash
cd backend
cp .env.example .env          # set DATABASE_URL + JWT_SECRET
createdb smarterp             # or create the DB any way you like
npm install
npm run db:init               # applies src/schema.sql
npm run dev                   # API on http://localhost:4000
```

### 2. Frontend

```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev                   # app on http://localhost:3000
```

## Try the flow

1. Register → create a company (max 5) → you land on the **Gateway of SmartERP**.
2. `Alt+S` → add a unit (PCS) and a stock item with purchase/selling price and GST%.
3. `Alt+L` → create a supplier and a customer.
4. `F9` → purchase voucher: stock goes up, supplier payable goes up.
5. `F8` → sales voucher: stock goes down, customer receivable goes up, invoice PDF is one click away. Overselling is blocked.
6. `Alt+R` → stock valuation and outstanding balances update instantly.

## API summary

| Method | Route | Purpose |
|---|---|---|
| POST | `/api/auth/register`, `/api/auth/login` | JWT auth |
| GET/POST/PUT/DELETE | `/api/companies` | Companies (max 5/user) |
| GET/POST/PUT/DELETE | `/api/ledgers` | Customer/supplier ledgers |
| GET | `/api/ledgers/:id/statement` | Party statement |
| GET/POST | `/api/stock/units`, `/api/stock/items` | Units & stock items |
| GET/POST | `/api/vouchers` | Day book / create voucher (transactional) |
| GET | `/api/vouchers/:id/invoice.pdf` | PDF invoice |
| GET | `/api/reports/stock-summary` · `/outstanding` · `/register` | Reports |

All company-scoped routes require `Authorization: Bearer <token>` and `x-company-id`.

## Deploy

- Frontend → Vercel (set `NEXT_PUBLIC_API_URL`)
- Backend → Railway/Render (set `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN`, `DATABASE_SSL=true` if your Postgres requires SSL)
- Database → any managed PostgreSQL (Railway/Render/Supabase)

## Notes / next steps (per the brief's future scope)

- Invoice assumes intra-state supply (CGST + SGST split). Add place-of-supply → IGST later.
- Next vouchers to add: receipt/payment (to settle outstanding balances), credit/debit notes.
- Email invoicing intentionally excluded, as specified in the brief.
