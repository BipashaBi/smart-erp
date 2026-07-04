"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, getToken, setCompany, logout } from "@/lib/api";

const EMPTY = { name: "", address: "", state: "", gstin: "", phone: "", financial_year: "" };

export default function CompaniesPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");

  const load = () => api("/companies").then(setCompanies).catch((e) => setError(e.message));

  useEffect(() => {
    if (!getToken()) return router.replace("/login");
    load();
  }, [router]);

  const select = (c) => {
    setCompany(c);
    router.push("/dashboard");
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      if (editingId) await api(`/companies/${editingId}`, { method: "PUT", body: form });
      else await api("/companies", { method: "POST", body: form });
      setForm(EMPTY);
      setEditingId(null);
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const remove = async (c) => {
    if (!confirm(`Delete ${c.name}? All its data will be removed.`)) return;
    try {
      await api(`/companies/${c.id}`, { method: "DELETE" });
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <div className="min-h-screen bg-gateway flex items-center justify-center px-4 py-10">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-8">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-xl font-bold text-gateway">Select company</h1>
          <button onClick={logout} className="text-sm text-slate-500 underline underline-offset-2">Log out</button>
        </div>
        <p className="text-sm text-slate-500 mb-5">An account can manage up to 5 companies.</p>

        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

        <div className="space-y-2 mb-6">
          {companies.map((c) => (
            <div key={c.id} className="flex items-center justify-between border border-slate-200 rounded px-4 py-3 hover:border-gateway">
              <button onClick={() => select(c)} className="text-left flex-1">
                <div className="font-semibold">{c.name}</div>
                <div className="text-xs text-slate-500">
                  {[c.state, c.gstin && `GSTIN ${c.gstin}`, c.financial_year && `FY ${c.financial_year}`].filter(Boolean).join(" · ")}
                </div>
              </button>
              <div className="flex gap-2 text-sm">
                <button className="btn-quiet" onClick={() => { setForm(c); setEditingId(c.id); setShowForm(true); }}>Edit</button>
                <button className="btn-quiet text-red-600" onClick={() => remove(c)}>Delete</button>
              </div>
            </div>
          ))}
          {!companies.length && <p className="text-sm text-slate-500">No companies yet — create your first one below.</p>}
        </div>

        {showForm ? (
          <form onSubmit={submit} className="grid grid-cols-2 gap-3">
            <input className="field col-span-2" placeholder="Company name" value={form.name} onChange={set("name")} required autoFocus />
            <input className="field col-span-2" placeholder="Address" value={form.address} onChange={set("address")} />
            <input className="field" placeholder="State" value={form.state} onChange={set("state")} />
            <input className="field" placeholder="GSTIN" value={form.gstin} onChange={set("gstin")} />
            <input className="field" placeholder="Phone" value={form.phone} onChange={set("phone")} />
            <input className="field" placeholder="Financial year (e.g. 2026-27)" value={form.financial_year} onChange={set("financial_year")} />
            <div className="col-span-2 flex gap-2">
              <button className="btn">{editingId ? "Save changes" : "Create company"}</button>
              <button type="button" className="btn-quiet" onClick={() => { setShowForm(false); setEditingId(null); setForm(EMPTY); }}>Cancel</button>
            </div>
          </form>
        ) : (
          companies.length < 5 && (
            <button className="btn" onClick={() => setShowForm(true)}>New company</button>
          )
        )}
      </div>
    </div>
  );
}
