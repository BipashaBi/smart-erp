"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, setSession } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const data = await api(`/auth/${mode}`, { method: "POST", body: form });
      setSession(data.token, data.user);
      router.push("/companies");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <div className="min-h-screen flex items-center justify-center bg-gateway px-4">
      <form onSubmit={submit} className="bg-white rounded-lg shadow-xl p-8 w-full max-w-sm space-y-4">
        <div>
          <div className="text-2xl font-bold text-gateway">
            Smart<span className="text-accent">ERP</span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Billing, inventory & accounting — built for the keyboard.
          </p>
        </div>

        {mode === "register" && (
          <input className="field" placeholder="Your name" value={form.name} onChange={set("name")} required autoFocus />
        )}
        <input className="field" type="email" placeholder="Email" value={form.email} onChange={set("email")} required autoFocus={mode === "login"} />
        <input className="field" type="password" placeholder="Password (6+ characters)" value={form.password} onChange={set("password")} required minLength={6} />

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button className="btn w-full justify-center" disabled={busy}>
          {mode === "login" ? "Log in" : "Create account"}
        </button>
        <button
          type="button"
          className="text-sm text-gateway underline underline-offset-2 w-full text-center"
          onClick={() => setMode(mode === "login" ? "register" : "login")}
        >
          {mode === "login" ? "New here? Create an account" : "Have an account? Log in"}
        </button>
      </form>
    </div>
  );
}
