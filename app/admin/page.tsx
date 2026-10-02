"use client";

import { useEffect, useState } from "react";
import Nav from "@/app/components/Nav";
import { rupiah } from "@/lib/format";

type Ringkasan = {
  komisiPersen: number; totalKomisiBersih: number;
  jumlahOrder: number; jumlahSubOrder: number; jumlahToko: number;
};
type Entry = { id: number; jenis: string; jumlah: number; keterangan: string; createdAt: string };

export default function AdminPage() {
  const [ringkas, setRingkas] = useState<Ringkasan | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [total, setTotal] = useState(0);
  const [persen, setPersen] = useState("5");
  const [msg, setMsg] = useState("");

  const muat = () => {
    fetch("/api/admin/ringkasan").then((r) => r.json()).then((d: Ringkasan) => {
      setRingkas(d);
      setPersen(String(d.komisiPersen));
    });
    fetch("/api/admin/ledger").then((r) => r.json()).then((d) => {
      setEntries(d.entries);
      setTotal(d.totalKomisiBersih);
    });
  };
  useEffect(muat, []);

  const simpan = async () => {
    setMsg("");
    const r = await fetch("/api/config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ komisiPersen: Number(persen) }),
    });
    const j = await r.json();
    if (!r.ok) setMsg("Gagal: " + (j.error || r.status));
    else {
      setMsg(`✓ Komisi platform diubah menjadi ${j.komisi_persen}% (berlaku untuk pembayaran berikutnya)`);
      muat();
    }
  };

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="text-2xl font-bold">Admin — Komisi & Ledger Platform</h1>
        {msg && <p className="mt-2 text-sm font-medium text-emerald-700">{msg}</p>}

        {ringkas && (
          <div className="mt-4 grid gap-4 sm:grid-cols-4">
            <div className="rounded-xl border bg-white p-4 shadow-sm">
              <p className="text-sm text-slate-500">Komisi bersih</p>
              <p className="text-xl font-bold text-emerald-700">{rupiah(total)}</p>
            </div>
            <div className="rounded-xl border bg-white p-4 shadow-sm">
              <p className="text-sm text-slate-500">Order</p>
              <p className="text-xl font-bold">{ringkas.jumlahOrder}</p>
            </div>
            <div className="rounded-xl border bg-white p-4 shadow-sm">
              <p className="text-sm text-slate-500">Sub-order</p>
              <p className="text-xl font-bold">{ringkas.jumlahSubOrder}</p>
            </div>
            <div className="rounded-xl border bg-white p-4 shadow-sm">
              <p className="text-sm text-slate-500">Toko</p>
              <p className="text-xl font-bold">{ringkas.jumlahToko}</p>
            </div>
          </div>
        )}

        <div className="mt-6 rounded-xl border bg-white p-4 shadow-sm">
          <h2 className="font-bold">Persentase Komisi Platform</h2>
          <div className="mt-2 flex items-center gap-2">
            <input
              type="number" min={0} max={100} step={0.5}
              className="w-28 rounded border px-2 py-1"
              value={persen}
              onChange={(e) => setPersen(e.target.value)}
            />
            <span className="text-sm">%</span>
            <button onClick={simpan} className="rounded-lg bg-sky-600 px-4 py-1.5 text-sm font-semibold text-white">
              Simpan
            </button>
          </div>
        </div>

        <h2 className="mt-8 text-lg font-bold">Ledger Komisi</h2>
        <div className="mt-3 overflow-x-auto rounded-xl border bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50 text-left">
                <th className="p-3">Waktu</th><th className="p-3">Jenis</th>
                <th className="p-3">Keterangan</th><th className="p-3 text-right">Jumlah</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className="border-b last:border-0">
                  <td className="p-3 text-slate-500">{e.createdAt.slice(0, 16).replace("T", " ")}</td>
                  <td className="p-3">{e.jenis}</td>
                  <td className="p-3">{e.keterangan}</td>
                  <td className={`p-3 text-right font-semibold ${e.jumlah >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                    {e.jumlah >= 0 ? "+" : ""}{rupiah(e.jumlah)}
                  </td>
                </tr>
              ))}
              {entries.length === 0 && (
                <tr><td colSpan={4} className="p-4 text-center text-slate-500">Belum ada komisi.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}
