"use client";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Shell from "@/components/Shell";
import { api, openPdf } from "@/lib/api";

const BLANK_ROW = { stock_item_id: "", quantity: "", rate: "" };

function VoucherForm() {
  const params = useSearchParams();
  const router = useRouter();
  const type = params.get("type") === "purchase" ? "purchase" : "sales";
  const isSales = type === "sales";

  const [parties, setParties] = useState([]);
  const [items, setItems] = useState([]);
  const [party, setParty] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [rows, setRows] = useState([{ ...BLANK_ROW }]);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setParty("");
    setRows([{ ...BLANK_ROW }]);
    setSaved(null);
    setError("");
    api(`/ledgers?type=${isSales ? "customer" : "supplier"}`).then(setParties).catch((e) => setError(e.message));
    api("/stock/items").then(setItems).catch(() => {});
  }, [type, isSales]);

  const itemById = useMemo(() => Object.fromEntries(items.map((i) => [String(i.id), i])), [items]);

  const setRow = (idx, key, value) => {
    setRows((prev) => {
      const next = prev.map((r, i) => (i === idx ? { ...r, [key]: value } : r));
      if (key === "stock_item_id" && value) {
        const item = itemById[value];
        if (item) next[idx].rate = isSales ? item.selling_price : item.purchase_price;
      }
      return next;
    });
  };

  const totals = useMemo(() => {
    let subtotal = 0, gst = 0;
    for (const r of rows) {
      const item = itemById[r.stock_item_id];
      const qty = Number(r.quantity), rate = Number(r.rate);
      if (!item || !(qty > 0) || !(rate >= 0)) continue;
      const amount = qty * rate;
      subtotal += amount;
      gst += (amount * Number(item.gst_percent)) / 100;
    }
    return { subtotal, gst, total: subtotal + gst };
  }, [rows, itemById]);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    const lines = rows.filter((r) => r.stock_item_id && Number(r.quantity) > 0);
    if (!lines.length) return setError("Add at least one item line.");
    setBusy(true);
    try {
      const voucher = await api("/vouchers", {
        method: "POST",
        body: { type, party_ledger_id: Number(party), voucher_date: date, notes, items: lines },
      });
      setSaved(voucher);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const fmt = (n) => "Rs. " + n.toFixed(2);

  if (saved) {
    return (
      <div className="bg-white rounded shadow p-6 max-w-lg mx-auto text-center space-y-4">
        <div className="text-2xl">✓</div>
        <h2 className="font-bold text-lg">{saved.voucher_no} saved</h2>
        <p className="text-sm text-slate-600">
          Total {fmt(Number(saved.total))} — {isSales ? "stock reduced and customer balance updated." : "stock added and supplier balance updated."}
        </p>
        <div className="flex justify-center gap-2">
          <button className="btn" onClick={() => openPdf(`/vouchers/${saved.id}/invoice.pdf`)}>
            {isSales ? "Open invoice PDF" : "Open voucher PDF"}
          </button>
          <button className="btn-quiet" onClick={() => { setSaved(null); setRows([{ ...BLANK_ROW }]); setParty(""); setNotes(""); }}>
            New {type} voucher
          </button>
          <button className="btn-quiet" onClick={() => router.push("/vouchers")}>Day book</button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="bg-white rounded shadow p-5 space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold text-slate-500">{isSales ? "Customer" : "Supplier"}</label>
          <select className="field mt-1" value={party} onChange={(e) => setParty(e.target.value)} required autoFocus>
            <option value="">Select {isSales ? "customer" : "supplier"}…</option>
            {parties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500">Date</label>
          <input className="field mt-1" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </div>
      </div>

      <div>
        <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-slate-500 mb-1">
          <span className="col-span-6">Item</span>
          <span className="col-span-2 text-right">Qty</span>
          <span className="col-span-2 text-right">Rate</span>
          <span className="col-span-2 text-right">Amount</span>
        </div>
        {rows.map((r, idx) => {
          const item = itemById[r.stock_item_id];
          const amount = Number(r.quantity) > 0 ? Number(r.quantity) * Number(r.rate || 0) : 0;
          return (
            <div key={idx} className="grid grid-cols-12 gap-2 mb-2 items-center">
              <select className="field col-span-6" value={r.stock_item_id} onChange={(e) => setRow(idx, "stock_item_id", e.target.value)}>
                <option value="">Select item…</option>
                {items.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name}{isSales ? ` (${Number(i.quantity)} in stock)` : ""}
                  </option>
                ))}
              </select>
              <input className="field col-span-2 text-right" type="number" step="0.001" min="0" placeholder="Qty" value={r.quantity} onChange={(e) => setRow(idx, "quantity", e.target.value)} />
              <input className="field col-span-2 text-right" type="number" step="0.01" min="0" placeholder="Rate" value={r.rate} onChange={(e) => setRow(idx, "rate", e.target.value)} />
              <div className="col-span-2 text-right text-sm font-mono">
                {amount ? amount.toFixed(2) : "—"}
                {item && <span className="block text-[10px] text-slate-400">GST {Number(item.gst_percent)}%</span>}
              </div>
            </div>
          );
        })}
        <div className="flex gap-2">
          <button type="button" className="btn-quiet" onClick={() => setRows([...rows, { ...BLANK_ROW }])}>+ Add line</button>
          {rows.length > 1 && (
            <button type="button" className="btn-quiet text-red-600" onClick={() => setRows(rows.slice(0, -1))}>Remove last line</button>
          )}
        </div>
      </div>

      <input className="field" placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />

      <div className="flex items-end justify-between border-t border-slate-100 pt-4">
        <div className="text-sm text-slate-600 space-y-0.5">
          <div>Subtotal: <span className="font-mono">{fmt(totals.subtotal)}</span></div>
          <div>GST: <span className="font-mono">{fmt(totals.gst)}</span></div>
          <div className="font-bold text-ink">Total: <span className="font-mono">{fmt(totals.total)}</span></div>
        </div>
        {error && <p className="text-sm text-red-600 max-w-xs text-right">{error}</p>}
        <button className="btn" disabled={busy || !party}>
          Save {type} voucher
        </button>
      </div>
    </form>
  );
}

export default function NewVoucherPage() {
  return (
    <Suspense>
      <PageInner />
    </Suspense>
  );
}

function PageInner() {
  const params = useSearchParams();
  const isSales = params.get("type") !== "purchase";
  return (
    <Shell title={isSales ? "Sales voucher (F8)" : "Purchase voucher (F9)"}>
      <VoucherForm />
    </Shell>
  );
}
