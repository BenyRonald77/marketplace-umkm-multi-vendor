import Link from "next/link";

const links = [
  { href: "/", label: "Beranda" },
  { href: "/katalog", label: "Katalog" },
  { href: "/keranjang", label: "Keranjang" },
  { href: "/checkout", label: "Checkout" },
  { href: "/pesanan", label: "Pesanan" },
  { href: "/vendor", label: "Vendor" },
  { href: "/admin", label: "Admin" },
];

export default function Nav() {
  return (
    <nav className="border-b bg-white">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-1 px-4 py-3">
        <span className="mr-4 text-lg font-bold">🛒 UMKM Market</span>
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="rounded px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            {l.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
