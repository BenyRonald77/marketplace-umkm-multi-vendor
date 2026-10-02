import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Marketplace UMKM Multi-Vendor",
  description: "Marketplace UMKM: keranjang lintas toko, sub-order per vendor, split dana & komisi",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className="min-h-screen text-slate-900">{children}</body>
    </html>
  );
}
