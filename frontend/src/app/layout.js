import "./globals.css";

export const metadata = {
  title: "SmartERP",
  description: "Billing, Inventory & Accounting — keyboard-first, Tally-inspired",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
