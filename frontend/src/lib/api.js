const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

export function getToken() {
  return typeof window !== "undefined" ? localStorage.getItem("token") : null;
}
export function getCompany() {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("company");
  return raw ? JSON.parse(raw) : null;
}
export function setSession(token, user) {
  localStorage.setItem("token", token);
  localStorage.setItem("user", JSON.stringify(user));
}
export function setCompany(company) {
  localStorage.setItem("company", JSON.stringify(company));
}
export function logout() {
  localStorage.clear();
  window.location.href = "/login";
}

function headers() {
  const h = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) h.Authorization = `Bearer ${token}`;
  const company = getCompany();
  if (company) h["x-company-id"] = company.id;
  return h;
}

export async function api(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: headers(),
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  if (res.status === 401 && typeof window !== "undefined" && !path.startsWith("/auth")) {
    logout();
    return;
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

// Fetch a PDF (needs auth headers) and open it in a new tab
export async function openPdf(path) {
  const res = await fetch(`${BASE}${path}`, { headers: headers() });
  if (!res.ok) throw new Error("Couldn't load the PDF");
  const blob = await res.blob();
  window.open(URL.createObjectURL(blob), "_blank");
}
