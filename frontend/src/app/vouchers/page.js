"use client";
import { useCallback, useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { api, openPdf } from "@/lib/api";

export default function DayBookPage() {
  const [type, setType] = useState("");
  const [vouchers, setVouchers] = useState([]);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    api(`/vouchers${type ? `?type=${type}` : ""}`).then(setVouchers).catch((e) => setError(e.message));
  }, [type]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Shell title="Day book">
      <div className="flex gap-2 mb-4">
        {[["", "All"], ["sales", "Sales"], ["purchase", "Purchase"]].map(([val, label]) => (
          <button
            key={val}
            onClick={() => setType(val)}
            className={`px-4 py-2 rounded text-sm font-medium border border-gateway ${type === val ? "bg-gateway text-white" : "bg-white text-gateway"}`}
          >
            {label}
          </button>
        ))}
      </div>
      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
      <div className="bg-white rounded shadow overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="th">Voucher</th>
              <th className="th">Type</th>
              <th className="th">Party</th>
              <th className="th">Date</th>
              <th className="th text-right">Subtotal</th>
              <th className="th text-right">GST</th>
              <th className="th text-right">Total</th>
              <th className="th"></th>
            </tr>
          </thead>
          <tbody>
            {vouchers.map((v) => (
              <tr key={v.id} className="hover:bg-panel/60">
                <td className="td font-medium">{v.voucher_no}</td>
                <td className="td capitalize">{v.type}</td>
                <td className="td">{v.party_name}</td>
                <td className="td">{new Date(v.voucher_date).toLocaleDateString("en-IN")}</td>
                <td className="td text-right font-mono">{Number(v.subtotal).toFixed(2)}</td>
                <td className="td text-right font-mono">{Number(v.gst_amount).toFixed(2)}</td>
                <td className="td text-right font-mono font-semibold">{Number(v.total).toFixed(2)}</td>
                <td className="td text-right">
                  <button className="btn-quiet" onClick={() => openPdf(`/vouchers/${v.id}/invoice.pdf`)}>PDF</button>
                </td>
              </tr>
            ))}
            {!vouchers.length && <tr><td className="td text-slate-500" colSpan={8}>No vouchers yet — press F8 for a sale or F9 for a purchase.</td></tr>}
          </tbody>
        </table>
      </div>
    </Shell>
  );
}
