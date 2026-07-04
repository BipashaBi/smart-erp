"use client";
import { useCallback, useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { api } from "@/lib/api";

const EMPTY = { type: "customer", name: "", phone: "", address: "", gstin: "", opening_balance: 0 };

export default function LedgersPage() {
  const [type, setType] = useState("customer");
  const [search, setSearch] = useState("");
  const [ledgers, setLedgers] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [showForm, setShowForm] = useState(false);
  const [statement, setStatement] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    api(`/ledgers?type=${type}&search=${encodeURIComponent(search)}`)
      .then(setLedgers)
      .catch((e) => setError(e.message));
  }, [type, search]);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await api("/ledgers", { method: "POST", body: { ...form, type } });
      setForm(EMPTY);
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const remove = async (l) => {
    if (!confirm(`Delete ledger ${l.name}?`)) return;
    try {
      await api(`/ledgers/${l.id}`, { method: "DELETE" });
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const openStatement = async (l) => {
    try {
      setStatement(await api(`/ledgers/${l.id}/statement`));
    } catch (err) {
      setError(err.message);
    }
  };

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const dueLabel = type === "customer" ? "Receivable" : "Payable";

  return (
    <Shell title="Ledgers">
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex rounded overflow-hidden border border-gateway">
          {["customer", "supplier"].map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`px-4 py-2 text-sm font-medium capitalize ${type === t ? "bg-gateway text-white" : "bg-white text-gateway"}`}
            >
              {t}s
            </button>
          ))}
        </div>
        <input className="field max-w-xs" placeholder="Search by name" value={search} onChange={(e) => setSearch(e.target.value)} />
        <button className="btn ml-auto" onClick={() => setShowForm(true)}>New {type}</button>
      </div>

      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

      {showForm && (
        <form onSubmit={submit} className="bg-white rounded shadow p-4 mb-4 grid grid-cols-2 gap-3">
          <input className="field col-span-2" placeholder={`${type === "customer" ? "Customer" : "Supplier"} name`} value={form.name} onChange={set("name")} required autoFocus />
          <input className="field" placeholder="Phone" value={form.phone} onChange={set("phone")} />
          <input className="field" placeholder="GSTIN" value={form.gstin} onChange={set("gstin")} />
          <input className="field" placeholder="Address" value={form.address} onChange={set("address")} />
          <input className="field" type="number" step="0.01" placeholder="Opening balance" value={form.opening_balance} onChange={set("opening_balance")} />
          <div className="col-span-2 flex gap-2">
            <button className="btn">Create ledger</button>
            <button type="button" className="btn-quiet" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </form>
      )}

      <div className="bg-white rounded shadow overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="th">Name</th>
              <th className="th">Phone</th>
              <th className="th">GSTIN</th>
              <th className="th text-right">{dueLabel} (Rs.)</th>
              <th className="th"></th>
            </tr>
          </thead>
          <tbody>
            {ledgers.map((l) => (
              <tr key={l.id} className="hover:bg-panel/60">
                <td className="td font-medium">{l.name}</td>
                <td className="td">{l.phone || "—"}</td>
                <td className="td">{l.gstin || "—"}</td>
                <td className="td text-right font-mono">{Number(l.balance).toFixed(2)}</td>
                <td className="td text-right whitespace-nowrap">
                  <button className="btn-quiet" onClick={() => openStatement(l)}>Statement</button>
                  <button className="btn-quiet text-red-600" onClick={() => remove(l)}>Delete</button>
                </td>
              </tr>
            ))}
            {!ledgers.length && (
              <tr><td className="td text-slate-500" colSpan={5}>No {type}s yet — create one to start billing.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {statement && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4" onClick={() => setStatement(null)}>
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-bold text-lg mb-1">{statement.ledger.name} — statement</h2>
            <p className="text-sm text-slate-500 mb-3">
              Opening Rs. {Number(statement.ledger.opening_balance).toFixed(2)} · Current balance Rs. {Number(statement.ledger.balance).toFixed(2)}
            </p>
            <table className="w-full">
              <thead><tr><th className="th">Voucher</th><th className="th">Date</th><th className="th text-right">Total</th></tr></thead>
              <tbody>
                {statement.vouchers.map((v) => (
                  <tr key={v.id}>
                    <td className="td">{v.voucher_no}</td>
                    <td className="td">{new Date(v.voucher_date).toLocaleDateString("en-IN")}</td>
                    <td className="td text-right font-mono">{Number(v.total).toFixed(2)}</td>
                  </tr>
                ))}
                {!statement.vouchers.length && <tr><td className="td text-slate-500" colSpan={3}>No vouchers for this party yet.</td></tr>}
              </tbody>
            </table>
            <button className="btn mt-4" onClick={() => setStatement(null)}>Close (Esc)</button>
          </div>
        </div>
      )}
    </Shell>
  );
}
