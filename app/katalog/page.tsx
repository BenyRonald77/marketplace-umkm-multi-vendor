"use client";

import { useEffect, useMemo, useState } from "react";
import Nav from "@/app/components/Nav";
import { rupiah } from "@/lib/format";

type Toko = { id: number; nama: string; tarifOngkir: number; statusAktif: boolean };
type Produk = {
  id: number; nama: string; harga: number; stok: number; kategori: string;
  statusAktif: boolean; tokoId: number;
  toko: { id: number; nama: string; tarifOngkir: number; statusAktif: boolean };
};
type Pembeli = { id: number; nama: string };

export default function KatalogPage() {
  const [tokos, setTokos] = useState<Toko[]>([]);
  const [produks, setProduks] = useState<Produk[]>([]);
  const [pembelis, setPembelis] = useState<Pembeli[]>([]);
  const [pembeliId, setPembeliId] = useState<number>(1);
  const [fToko, setFToko] = useState("");
  const [fKat, setFKat] = useState("");
  const [fQ, setFQ] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch("/api/toko").then((r) => r.json()).then(setTokos);
    fetch("/api/produk").then((r) => r.json()).then(setProduks);
    fetch("/api/pembeli").then((r) => r.json()).then((ps: Pembeli[]) => {
      setPembelis(ps);
      const saved = Number(localStorage.getItem("pembeliId") || "1");
      if (ps.some((p) => p.id === saved)) setPembeliId(saved);
    });
  }, []);

  const kategoris = useMemo(
    () => Array.from(new Set(produks.map((p) => p.kategori))).sort(),
    [produks]
  );

  const filtered = produks.filter((p) => {
    if (fToko && p.tokoId !== Number(fToko)) return false;
    if (fKat && p.kategori !== fKat) return false;
    if (fQ && !p.nama.toLowerCase().includes(fQ.toLowerCase())) return false;
    return true;
  });

  const pilihPembeli = (id: number) => {
    setPembeliId(id);
    localStorage.setItem("pembeliId", String(id));
  };

  const tambah = async (produk: Produk) => {
    setMsg("");
    const r = await fetch("/api/keranjang", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pembeliId, produkId: produk.id, qty: 1 }),
    });
    const j = await r.json();
    if (!r.ok) setMsg("Gagal: " + (j.error || r.status));
    else setMsg(`✓ "${produk.nama}" masuk keranjang`);
  };

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Katalog Produk</h1>
            <p className="text-sm text-slate-500">Produk dari semua toko UMKM dalam satu tempat</p>
          </div>
          <label className="text-sm">
            Pembeli:{" "}
            <select
              className="rounded border px-2 py-1"
              value={pembeliId}
              onChange={(e) => pilihPembeli(Number(e.target.value))}
            >
              {pembelis.map((p) => (
                <option key={p.id} value={p.id}>{p.nama}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <select className="rounded border px-3 py-2 text-sm" value={fToko} onChange={(e) => setFToko(e.target.value)}>
            <option value="">Semua toko</option>
            {tokos.map((t) => (
              <option key={t.id} value={t.id}>{t.nama}</option>
            ))}
          </select>
          <select className="rounded border px-3 py-2 text-sm" value={fKat} onChange={(e) => setFKat(e.target.value)}>
            <option value="">Semua kategori</option>
            {kategoris.map((k) => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
          <input
            className="rounded border px-3 py-2 text-sm"
            placeholder="Cari produk…"
            value={fQ}
            onChange={(e) => setFQ(e.target.value)}
          />
        </div>

        {msg && <p className="mt-3 text-sm font-medium text-emerald-700">{msg}</p>}

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <div key={p.id} className="rounded-xl border bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{p.toko.nama}</p>
              <h3 className="mt-1 font-semibold">{p.nama}</h3>
              <p className="text-sm text-slate-500">{p.kategori} · Stok: {p.stok}</p>
              <p className="mt-2 text-lg font-bold text-emerald-700">{rupiah(p.harga)}</p>
              <button
                disabled={!p.statusAktif || !p.toko.statusAktif || p.stok === 0}
                onClick={() => tambah(p)}
                className="mt-3 w-full rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:bg-slate-300"
              >
                {!p.statusAktif || !p.toko.statusAktif ? "Nonaktif" : p.stok === 0 ? "Stok Habis" : "+ Keranjang"}
              </button>
            </div>
          ))}
        </div>
        {filtered.length === 0 && <p className="mt-8 text-center text-slate-500">Tidak ada produk yang cocok.</p>}
      </main>
    </>
  );
}
