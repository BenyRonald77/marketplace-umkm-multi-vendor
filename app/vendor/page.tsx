"use client";

import { useEffect, useState } from "react";
import Nav from "@/app/components/Nav";
import { rupiah, STATUS_SUBORDER } from "@/lib/format";

type Toko = { id: number; nama: string; pemilik: string };
type Dashboard = {
  toko: Toko;
  saldo: number;
  subOrders: {
    id: number; ongkir: number; subtotalItem: number; komisi: number;
    bersihVendor: number; dibayar: boolean; status: string;
    order: { kode: string; status: string };
    items: { id: number; namaProduk: string; qty: number; subtotal: number }[];
  }[];
  mutasi: { id: number; jenis: string; jumlah: number; keterangan: string; createdAt: string }[];
};

const NEXT: Record<string, { ke: string; label: string }> = {
  menunggu_bayar: { ke: "diproses", label: "Proses" },
  diproses: { ke: "dikirim", label: "Kirim" },
  dikirim: { ke: "selesai", label: "Selesaikan" },
};

export default function VendorPage() {
  const [tokos, setTokos] = useState<Toko[]>([]);
  const [tokoId, setTokoId] = useState<number | null>(null);
  const [dash, setDash] = useState<Dashboard | null>(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch("/api/toko").then((r) => r.json()).then((t: Toko[]) => {
      setTokos(t);
      if (t.length > 0) setTokoId(t[0].id);
    });
  }, []);

  useEffect(() => {
    if (tokoId) muat(tokoId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokoId]);

  const muat = (id: number) =>
    fetch(`/api/vendor/${id}/dashboard`).then((r) => r.json()).then(setDash);

  const maju = async (subId: number, ke: string) => {
    setMsg("");
    const r = await fetch(`/api/suborder/${subId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: ke }),
    });
    const j = await r.json();
    if (!r.ok) setMsg("Gagal: " + (j.error || r.status));
    else if (tokoId) muat(tokoId);
  };

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">Dashboard Vendor</h1>
          <label className="text-sm">
            Toko:{" "}
            <select
              className="rounded border px-2 py-1"
              value={tokoId ?? ""}
              onChange={(e) => setTokoId(Number(e.target.value))}
            >
              {tokos.map((t) => (
                <option key={t.id} value={t.id}>{t.nama}</option>
              ))}
            </select>
          </label>
        </div>
        {msg && <p className="mt-2 text-sm font-medium text-red-600">{msg}</p>}

        {dash && (
          <>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border bg-white p-4 shadow-sm">
                <p className="text-sm text-slate-500">Saldo saat ini</p>
                <p className="text-2xl font-bold text-emerald-700">{rupiah(dash.saldo)}</p>
              </div>
              <div className="rounded-xl border bg-white p-4 shadow-sm">
                <p className="text-sm text-slate-500">Sub-order masuk</p>
                <p className="text-2xl font-bold">{dash.subOrders.length}</p>
              </div>
              <div className="rounded-xl border bg-white p-4 shadow-sm">
                <p className="text-sm text-slate-500">Komisi terpotong</p>
                <p className="text-2xl font-bold">
                  {rupiah(dash.subOrders.filter((s) => s.dibayar).reduce((a, s) => a + s.komisi, 0))}
                </p>
              </div>
            </div>

            <h2 className="mt-8 text-lg font-bold">Pesanan Masuk</h2>
            {dash.subOrders.map((s) => (
              <div key={s.id} className="mt-3 rounded-xl border bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold">
                    {s.order.kode} · {STATUS_SUBORDER[s.status]}
                  </p>
                  {NEXT[s.status] && (
                    <button
                      onClick={() => maju(s.id, NEXT[s.status].ke)}
                      className="rounded-lg bg-sky-600 px-3 py-1.5 text-sm font-semibold text-white"
                    >
                      {NEXT[s.status].label} →
                    </button>
                  )}
                </div>
                <ul className="mt-1 text-sm text-slate-600">
                  {s.items.map((it) => (
                    <li key={it.id} className="flex justify-between">
                      <span>{it.namaProduk} × {it.qty}</span>
                      <span>{rupiah(it.subtotal)}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-1 text-sm text-slate-600">
                  Item {rupiah(s.subtotalItem)} + ongkir {rupiah(s.ongkir)}
                  {s.dibayar && <> · bersih <span className="font-semibold text-emerald-700">{rupiah(s.bersihVendor)}</span> (komisi {rupiah(s.komisi)})</>}
                </p>
              </div>
            ))}

            <h2 className="mt-8 text-lg font-bold">Riwayat Mutasi Saldo</h2>
            <div className="mt-3 overflow-x-auto rounded-xl border bg-white shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50 text-left">
                    <th className="p-3">Waktu</th><th className="p-3">Jenis</th>
                    <th className="p-3">Keterangan</th><th className="p-3 text-right">Jumlah</th>
                  </tr>
                </thead>
                <tbody>
                  {dash.mutasi.map((m) => (
                    <tr key={m.id} className="border-b last:border-0">
                      <td className="p-3 text-slate-500">{m.createdAt.slice(0, 16).replace("T", " ")}</td>
                      <td className="p-3">{m.jenis}</td>
                      <td className="p-3">{m.keterangan}</td>
                      <td className={`p-3 text-right font-semibold ${m.jumlah >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                        {m.jumlah >= 0 ? "+" : ""}{rupiah(m.jumlah)}
                      </td>
                    </tr>
                  ))}
                  {dash.mutasi.length === 0 && (
                    <tr><td colSpan={4} className="p-4 text-center text-slate-500">Belum ada mutasi.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>
    </>
  );
}
