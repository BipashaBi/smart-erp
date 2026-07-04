"use client";
import { useCallback, useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { api } from "@/lib/api";

const EMPTY = { name: "", sku: "", unit_id: "", purchase_price: "", selling_price: "", gst_percent: "", quantity: "" };

export default function StockPage() {
  const [items, setItems] = useState([]);
  const [units, setUnits] = useState([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(EMPTY);
  const [showForm, setShowForm] = useState(false);
  const [newUnit, setNewUnit] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(() => {
    api(`/stock/items?search=${encodeURIComponent(search)}`).then(setItems).catch((e) => setError(e.message));
    api("/stock/units").then(setUnits).catch(() => {});
  }, [search]);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await api("/stock/items", {
        method: "POST",
        body: { ...form, unit_id: form.unit_id || null },
      });
      setForm(EMPTY);
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const addUnit = async () => {
    if (!newUnit.trim()) return;
    try {
      await api("/stock/units", { method: "POST", body: { name: newUnit } });
      setNewUnit("");
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const remove = async (item) => {
    if (!confirm(`Delete ${item.name}?`)) return;
    try {
      await api(`/stock/items/${item.id}`, { method: "DELETE" });
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <Shell title="Stock items">
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <input className="field max-w-xs" placeholder="Search name or SKU" value={search} onChange={(e) => setSearch(e.target.value)} />
        <div className="flex items-center gap-2 ml-auto">
          <input className="field w-28" placeholder="New unit" value={newUnit} onChange={(e) => setNewUnit(e.target.value)} />
          <button className="btn-quiet" onClick={addUnit}>Add unit</button>
          <button className="btn" onClick={() => setShowForm(true)}>New item</button>
        </div>
      </div>

      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

      {showForm && (
        <form onSubmit={submit} className="bg-white rounded shadow p-4 mb-4 grid grid-cols-3 gap-3">
          <input className="field" placeholder="Item name" value={form.name} onChange={set("name")} required autoFocus />
          <input className="field" placeholder="SKU (e.g. KEY-001)" value={form.sku} onChange={set("sku")} />
          <select className="field" value={form.unit_id} onChange={set("unit_id")}>
            <option value="">Unit…</option>
            {units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
          <input className="field" type="number" step="0.01" min="0" placeholder="Purchase price" value={form.purchase_price} onChange={set("purchase_price")} />
          <input className="field" type="number" step="0.01" min="0" placeholder="Selling price" value={form.selling_price} onChange={set("selling_price")} />
          <input className="field" type="number" step="0.01" min="0" max="100" placeholder="GST %" value={form.gst_percent} onChange={set("gst_percent")} />
          <input className="field" type="number" step="0.001" min="0" placeholder="Opening quantity" value={form.quantity} onChange={set("quantity")} />
          <div className="col-span-2 flex gap-2 items-center">
            <button className="btn">Create item</button>
            <button type="button" className="btn-quiet" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </form>
      )}

      <div className="bg-white rounded shadow overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="th">Item</th>
              <th className="th">SKU</th>
              <th className="th">Unit</th>
              <th className="th text-right">Purchase</th>
              <th className="th text-right">Selling</th>
              <th className="th text-right">GST%</th>
              <th className="th text-right">In stock</th>
              <th className="th"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.id} className={`hover:bg-panel/60 ${Number(i.quantity) <= 0 ? "text-red-600" : ""}`}>
                <td className="td font-medium">{i.name}</td>
                <td className="td">{i.sku || "—"}</td>
                <td className="td">{i.unit || "—"}</td>
                <td className="td text-right font-mono">{Number(i.purchase_price).toFixed(2)}</td>
                <td className="td text-right font-mono">{Number(i.selling_price).toFixed(2)}</td>
                <td className="td text-right font-mono">{Number(i.gst_percent).toFixed(1)}</td>
                <td className="td text-right font-mono">{Number(i.quantity)}</td>
                <td className="td text-right">
                  <button className="btn-quiet text-red-600" onClick={() => remove(i)}>Delete</button>
                </td>
              </tr>
            ))}
            {!items.length && <tr><td className="td text-slate-500" colSpan={8}>No stock items yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </Shell>
  );
}
