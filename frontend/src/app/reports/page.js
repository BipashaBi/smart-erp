"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Shell from "@/components/Shell";
import { api } from "@/lib/api";

const TABS = [
  ["stock", "Stock summary"],
  ["outstanding", "Outstanding"],
  ["register", "Registers"],
];

function Reports() {
  const params = useSearchParams();
  const [tab, setTab] = useState(params.get("tab") || "stock");
  const [stock, setStock] = useState(null);
  const [outstanding, setOutstanding] = useState(null);
  const [registerType, setRegisterType] = useState("sales");
  const [register, setRegister] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    setError("");
    if (tab === "stock") api("/reports/stock-summary").then(setStock).catch((e) => setError(e.message));
    if (tab === "outstanding") api("/reports/outstanding").then(setOutstanding).catch((e) => setError(e.message));
    if (tab === "register") api(`/reports/register?type=${registerType}`).then(setRegister).catch((e) => setError(e.message));
  }, [tab, registerType]);

  const money = (n) => "Rs. " + Number(n).toFixed(2);

  return (
    <Shell title="Reports">
      <div className="flex gap-2 mb-4">
        {TABS.map(([val, label]) => (
          <button
            key={val}
            onClick={() => setTab(val)}
            className={`px-4 py-2 rounded text-sm font-medium border border-gateway ${tab === val ? "bg-gateway text-white" : "bg-white text-gateway"}`}
          >
            {label}
          </button>
        ))}
      </div>
      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

      {tab === "stock" && stock && (
        <div className="bg-white rounded shadow overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="th">Item</th><th className="th">SKU</th><th className="th">Unit</th>
                <th className="th text-right">Qty</th><th className="th text-right">Purchase rate</th>
                <th className="th text-right">Valuation</th>
              </tr>
            </thead>
            <tbody>
              {stock.items.map((i) => (
                <tr key={i.id} className={Number(i.quantity) <= 5 ? "text-red-600" : ""}>
                  <td className="td font-medium">{i.name}</td>
                  <td className="td">{i.sku || "—"}</td>
                  <td className="td">{i.unit || "—"}</td>
                  <td className="td text-right font-mono">{Number(i.quantity)}</td>
                  <td className="td text-right font-mono">{Number(i.purchase_price).toFixed(2)}</td>
                  <td className="td text-right font-mono">{Number(i.valuation).toFixed(2)}</td>
                </tr>
              ))}
              <tr className="font-bold">
                <td className="td" colSpan={5}>Total inventory valuation</td>
                <td className="td text-right font-mono">{money(stock.total_valuation)}</td>
              </tr>
            </tbody>
          </table>
          <p className="text-xs text-slate-500 px-3 pb-3">Rows in red are at or below 5 units — time to restock.</p>
        </div>
      )}

      {tab === "outstanding" && outstanding && (
        <div className="grid md:grid-cols-2 gap-4">
          {[
            ["Receivables — customers owe you", outstanding.receivables, outstanding.total_receivable],
            ["Payables — you owe suppliers", outstanding.payables, outstanding.total_payable],
          ].map(([heading, list, total]) => (
            <div key={heading} className="bg-white rounded shadow">
              <div className="px-4 py-3 font-semibold border-b border-slate-100">{heading}</div>
              <table className="w-full">
                <tbody>
                  {list.map((l) => (
                    <tr key={l.id}>
                      <td className="td">{l.name}</td>
                      <td className="td text-right font-mono">{Number(l.balance).toFixed(2)}</td>
                    </tr>
                  ))}
                  {!list.length && <tr><td className="td text-slate-500">Nothing outstanding.</td></tr>}
                  <tr className="font-bold"><td className="td">Total</td><td className="td text-right font-mono">{money(total)}</td></tr>
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      {tab === "register" && (
        <div className="bg-white rounded shadow">
          <div className="px-4 py-3 border-b border-slate-100 flex gap-2">
            {["sales", "purchase"].map((t) => (
              <button
                key={t}
                onClick={() => setRegisterType(t)}
                className={`px-3 py-1.5 rounded text-sm capitalize ${registerType === t ? "bg-gateway text-white" : "text-gateway"}`}
              >
                {t} register
              </button>
            ))}
          </div>
          <table className="w-full">
            <thead>
              <tr>
                <th className="th">Date</th><th className="th text-right">Vouchers</th>
                <th className="th text-right">Subtotal</th><th className="th text-right">GST</th>
                <th className="th text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {register.map((r) => (
                <tr key={r.voucher_date}>
                  <td className="td">{new Date(r.voucher_date).toLocaleDateString("en-IN")}</td>
                  <td className="td text-right font-mono">{r.voucher_count}</td>
                  <td className="td text-right font-mono">{Number(r.subtotal).toFixed(2)}</td>
                  <td className="td text-right font-mono">{Number(r.gst_amount).toFixed(2)}</td>
                  <td className="td text-right font-mono font-semibold">{Number(r.total).toFixed(2)}</td>
                </tr>
              ))}
              {!register.length && <tr><td className="td text-slate-500" colSpan={5}>No {registerType} vouchers yet.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </Shell>
  );
}

export default function ReportsPage() {
  return (
    <Suspense>
      <Reports />
    </Suspense>
  );
}
