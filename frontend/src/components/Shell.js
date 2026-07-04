"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getToken, getCompany, logout } from "@/lib/api";

// Global keyboard map (subset of the spec, wired end to end)
const SHORTCUTS = [
  { keys: "F1", label: "Companies", href: "/companies" },
  { keys: "Ctrl+H", label: "Gateway", href: "/dashboard" },
  { keys: "Alt+L", label: "Ledgers", href: "/ledgers" },
  { keys: "Alt+S", label: "Stock", href: "/stock" },
  { keys: "F8", label: "Sales", href: "/vouchers/new?type=sales" },
  { keys: "F9", label: "Purchase", href: "/vouchers/new?type=purchase" },
  { keys: "Alt+D", label: "Day Book", href: "/vouchers" },
  { keys: "Alt+R", label: "Reports", href: "/reports" },
  { keys: "Esc", label: "Back", href: null },
];

export default function Shell({ children, title }) {
  const router = useRouter();

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    if (!getCompany()) router.replace("/companies");
  }, [router]);

  useEffect(() => {
    const onKey = (e) => {
      const inField = ["INPUT", "SELECT", "TEXTAREA"].includes(e.target.tagName);
      const go = (href) => {
        e.preventDefault();
        router.push(href);
      };
      if (e.key === "F1") return go("/companies");
      if (e.key === "F8" && !e.altKey) return go("/vouchers/new?type=sales");
      if (e.key === "F9" && !e.altKey) return go("/vouchers/new?type=purchase");
      if (e.ctrlKey && e.key.toLowerCase() === "h") return go("/dashboard");
      if (e.ctrlKey && e.key.toLowerCase() === "q") {
        e.preventDefault();
        return logout();
      }
      if (e.altKey && !inField) {
        const k = e.key.toLowerCase();
        if (k === "l") return go("/ledgers");
        if (k === "s") return go("/stock");
        if (k === "d") return go("/vouchers");
        if (k === "r") return go("/reports");
      }
      if (e.key === "Escape" && !inField) {
        e.preventDefault();
        router.back();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  const company = typeof window !== "undefined" ? getCompany() : null;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-gateway text-white">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/dashboard" className="font-bold tracking-wide">
            Smart<span className="text-accent">ERP</span>
          </Link>
          <div className="flex items-center gap-4 text-sm">
            {company && <span className="opacity-90">{company.name}</span>}
            <button onClick={logout} className="underline underline-offset-2 opacity-80 hover:opacity-100">
              Log out <span className="kbd ml-1">Ctrl+Q</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6">
        {title && <h1 className="text-xl font-bold mb-4">{title}</h1>}
        {children}
      </main>

      <footer className="bg-gateway text-white text-xs">
        <div className="max-w-5xl mx-auto px-4 py-2 flex flex-wrap gap-x-4 gap-y-1">
          {SHORTCUTS.map((s) => (
            <span key={s.keys} className="flex items-center gap-1.5 opacity-90">
              <span className="kbd">{s.keys}</span> {s.label}
            </span>
          ))}
        </div>
      </footer>
    </div>
  );
}
