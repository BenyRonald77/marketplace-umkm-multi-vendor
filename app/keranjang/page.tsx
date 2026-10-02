"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Nav from "@/app/components/Nav";
import { rupiah } from "@/lib/format";

type Item = {
  id: number; qty: number;
  produk: {
    id: number; nama: string; harga: number; stok: number;
    toko: { id: number; nama: string; tarifOngkir: number };
  };
};

export default function KeranjangPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [pembeliId, setPembeliId] = useState(1);
  const [msg, setMsg] = useState("");

  const muat = (pid: number) =>
    fetch(`/api/keranjang?pembeliId=${pid}`)
      .then((r) => r.json())
      .then((d) => setItems(Array.isArray(d) ? d : []));

  useEffect(() => {
    const pid = Number(localStorage.getItem("pembeliId") || "1");
    setPembeliId(pid);
    muat(pid);
  }, []);

  const ubahQty = async (produkId: number, qty: number) => {
    setMsg("");
    const r = await fetch("/api/keranjang", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pembeliId, produkId, qty }),
    });
    const j = await r.json();
    if (!r.ok) setMsg("Gagal: " + (j.error || r.status));
    else muat(pembeliId);
  };

  const hapus = async (produkId: number) => {
    const r = await fetch(`/api/keranjang?pembeliId=${pembeliId}&produkId=${produkId}`, {
      method: "DELETE",
    });
    if (r.ok) muat(pembeliId);
  };

  const perToko = new Map<number, { nama: string; items: Item[] }>();
  for (const it of items) {
    const t = it.produk.toko;
    if (!perToko.has(t.id)) perToko.set(t.id, { nama: t.nama, items: [] });
    perToko.get(t.id)!.items.push(it);
  }
  const total = items.reduce((s, it) => s + it.qty * it.produk.harga, 0);

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="text-2xl font-bold">Keranjang Belanja</h1>
        {msg && <p className="mt-2 text-sm font-medium text-red-600">{msg}</p>}

        {items.length === 0 ? (
          <p className="mt-6 text-slate-500">
            Keranjang kosong. <Link href="/katalog" className="text-emerald-700 underline">Lihat katalog</Link>
          </p>
        ) : (
          <>
            {Array.from(perToko.entries()).map(([tokoId, g]) => (
              <div key={tokoId} className="mt-6 rounded-xl border bg-white p-4 shadow-sm">
                <h2 className="font-semibold">🏪 {g.nama}</h2>
                {g.items.map((it) => (
                  <div key={it.id} className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t pt-3">
                    <div>
                      <p className="font-medium">{it.produk.nama}</p>
                      <p className="text-sm text-slate-500">
                        {rupiah(it.produk.harga)} × {it.qty} ={" "}
                        <span className="font-semibold text-slate-700">{rupiah(it.qty * it.produk.harga)}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => ubahQty(it.produk.id, it.qty - 1)} className="rounded border px-2 py-1">−</button>
                      <span className="w-8 text-center font-semibold">{it.qty}</span>
                      <button onClick={() => ubahQty(it.produk.id, it.qty + 1)} className="rounded border px-2 py-1">+</button>
                      <button onClick={() => hapus(it.produk.id)} className="ml-2 rounded border border-red-300 px-2 py-1 text-sm text-red-600">
                        Hapus
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ))}
            <div className="mt-6 flex items-center justify-between rounded-xl border bg-white p-4 shadow-sm">
              <p className="text-lg">Subtotal: <span className="font-bold">{rupiah(total)}</span></p>
              <Link href="/checkout" className="rounded-lg bg-emerald-600 px-6 py-2.5 font-semibold text-white">
                Lanjut ke Checkout →
              </Link>
            </div>
          </>
        )}
      </main>
    </>
  );
}
