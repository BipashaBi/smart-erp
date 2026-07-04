"use client";
import Link from "next/link";
import Shell from "@/components/Shell";

const MENU = [
  {
    heading: "Masters",
    items: [
      { label: "Ledgers — customers & suppliers", href: "/ledgers", keys: "Alt+L" },
      { label: "Stock items & units", href: "/stock", keys: "Alt+S" },
    ],
  },
  {
    heading: "Transactions",
    items: [
      { label: "Sales voucher / customer bill", href: "/vouchers/new?type=sales", keys: "F8" },
      { label: "Purchase voucher / stock entry", href: "/vouchers/new?type=purchase", keys: "F9" },
      { label: "Day book — all vouchers", href: "/vouchers", keys: "Alt+D" },
    ],
  },
  {
    heading: "Reports",
    items: [
      { label: "Stock summary & valuation", href: "/reports", keys: "Alt+R" },
      { label: "Outstanding — receivables & payables", href: "/reports?tab=outstanding", keys: "" },
      { label: "Sales / purchase register", href: "/reports?tab=register", keys: "" },
    ],
  },
];

export default function Dashboard() {
  return (
    <Shell>
      <div className="max-w-lg mx-auto">
        <div className="bg-gateway text-white rounded-t-lg px-5 py-3 font-bold tracking-wide">
          Gateway of SmartERP
        </div>
        <div className="bg-white rounded-b-lg shadow divide-y divide-slate-100">
          {MENU.map((section) => (
            <div key={section.heading} className="py-2">
              <div className="px-5 py-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                {section.heading}
              </div>
              {section.items.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="flex items-center justify-between px-5 py-2.5 text-sm hover:bg-accent/20 focus:bg-accent/20 focus:outline-none"
                >
                  <span>{item.label}</span>
                  {item.keys && <span className="kbd-dark">{item.keys}</span>}
                </Link>
              ))}
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-500 mt-3 text-center">
          Everything here works without a mouse — the shortcut bar below is always live.
        </p>
      </div>
    </Shell>
  );
}
