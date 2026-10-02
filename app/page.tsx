import Link from "next/link";

const menu = [
  { href: "/katalog", judul: "Katalog Produk", desc: "Jelajahi produk dari semua toko UMKM" },
  { href: "/keranjang", judul: "Keranjang", desc: "Keranjang belanja lintas toko" },
  { href: "/checkout", judul: "Checkout", desc: "Pecah otomatis jadi sub-order per vendor" },
  { href: "/pesanan", judul: "Pesanan Saya", desc: "Lacak sub-order & bayar tagihan" },
  { href: "/vendor", judul: "Dashboard Vendor", desc: "Pesanan masuk, saldo, dan mutasi toko" },
  { href: "/admin", judul: "Admin Komisi", desc: "Ledger komisi platform & konfigurasi" },
];

export default function Home() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-3xl font-bold">Marketplace UMKM Multi-Vendor</h1>
      <p className="mt-2 text-slate-600">
        Satu keranjang dari banyak toko. Checkout otomatis dipecah jadi sub-order per vendor —
        ongkir dan status masing-masing, satu tagihan pembayaran, dana dibagi ke saldo vendor
        setelah dipotong komisi platform.
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {menu.map((m) => (
          <Link
            key={m.href}
            href={m.href}
            className="rounded-xl border bg-white p-5 shadow-sm transition hover:shadow-md"
          >
            <h2 className="text-lg font-semibold">{m.judul}</h2>
            <p className="mt-1 text-sm text-slate-500">{m.desc}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
