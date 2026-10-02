"use client";

import { useEffect, useState } from "react";
import Nav from "@/app/components/Nav";
import { rupiah, STATUS_ORDER, STATUS_SUBORDER } from "@/lib/format";

type SubOrder = {
  id: number; ongkir: number; subtotalItem: number; komisi: number;
  status: string; dibayar: boolean;
  toko: { id: number; nama: string };
  items: { id: number; namaProduk: string; qty: number; hargaSatuan: number; subtotal: number }[];
};
type Order = {
  id: number; kode: string; total: number; ongkirTotal: number; status: string;
  subOrders: SubOrder[];
};

export default function PesananPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [msg, setMsg] = useState("");
  const [pembeliId, setPembeliId] = useState(1);

  const muat = (pid: number) =>
    fetch(`/api/pesanan?pembeliId=${pid}`)
      .then((r) => r.json())
      .then((d) => setOrders(Array.isArray(d) ? d : []));

  useEffect(() => {
    const pid = Number(localStorage.getItem("pembeliId") || "1");
    setPembeliId(pid);
    muat(pid);
  }, []);

  const bayar = async (orderId: number) => {
    setMsg("");
    const r = await fetch("/api/pembayaran", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, metode: "transfer" }),
    });
    const j = await r.json();
    if (!r.ok) setMsg("Gagal bayar: " + (j.error || r.status));
    else {
      setMsg(`✓ Pembayaran ${j.kode} lunas: ${rupiah(j.totalBayar)} (komisi platform ${rupiah(j.totalKomisi)})`);
      muat(pembeliId);
    }
  };

  const badge = (st: string, map: Record<string, string>) => (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
      st === "dibatalkan" ? "bg-red-100 text-red-700"
      : st === "selesai" || st === "lunas" ? "bg-emerald-100 text-emerald-700"
      : "bg-amber-100 text-amber-700"
    }`}>{map[st] ?? st}</span>
  );

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="text-2xl font-bold">Pesanan Saya</h1>
        {msg && <p className="mt-2 text-sm font-medium text-emerald-700">{msg}</p>}
        {orders.length === 0 && <p className="mt-6 text-slate-500">Belum ada pesanan.</p>}
        {orders.map((o) => (
          <div key={o.id} className="mt-6 rounded-xl border bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="font-bold">{o.kode}</h2>
                <p className="text-sm text-slate-500">
                  Total {rupiah(o.total)} (ongkir {rupiah(o.ongkirTotal)}) · {o.subOrders.length} sub-order
                </p>
              </div>
              <div className="flex items-center gap-2">
                {badge(o.status, STATUS_ORDER)}
                {o.status === "menunggu_pembayaran" && (
                  <button onClick={() => bayar(o.id)} className="rounded-lg bg-emerald-600 px-4 py-1.5 text-sm font-semibold text-white">
                    Bayar Sekarang
                  </button>
                )}
              </div>
            </div>
            <div className="mt-3 space-y-3">
              {o.subOrders.map((s) => (
                <div key={s.id} className="rounded-lg border border-slate-200 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold">🏪 {s.toko.nama}</p>
                    {badge(s.status, STATUS_SUBORDER)}
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
                    Ongkir {rupiah(s.ongkir)} · Total sub-order{" "}
                    <span className="font-semibold">{rupiah(s.subtotalItem + s.ongkir)}</span>
                    {s.dibayar && <span className="text-emerald-700"> · dana diteruskan ke vendor</span>}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </main>
    </>
  );
}
