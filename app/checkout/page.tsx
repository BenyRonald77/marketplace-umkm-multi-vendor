"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Nav from "@/app/components/Nav";
import { rupiah } from "@/lib/format";

type Preview = {
  groups: {
    toko: { id: number; nama: string; tarifOngkir: number };
    items: { produkId: number; nama: string; harga: number; qty: number; subtotal: number }[];
    subtotalItem: number;
    ongkir: number;
  }[];
  subtotalItem: number;
  ongkirTotal: number;
  total: number;
};

export default function CheckoutPage() {
  const router = useRouter();
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [pembeliId, setPembeliId] = useState(1);

  useEffect(() => {
    const pid = Number(localStorage.getItem("pembeliId") || "1");
    setPembeliId(pid);
    fetch(`/api/checkout/preview?pembeliId=${pid}`)
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) setError(j.error || "gagal memuat pratinjau");
        else setPreview(j);
      });
  }, []);

  const buatPesanan = async () => {
    setLoading(true);
    setError("");
    const r = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pembeliId }),
    });
    const j = await r.json();
    setLoading(false);
    if (!r.ok) {
      setError(j.error || "checkout gagal");
      return;
    }
    router.push("/pesanan");
  };

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="text-2xl font-bold">Checkout</h1>
        <p className="text-sm text-slate-500">
          Keranjang otomatis dipecah menjadi sub-order per vendor — tiap vendor punya ongkir sendiri.
        </p>
        {error && <p className="mt-3 rounded bg-red-50 p-3 text-sm font-medium text-red-700">{error}</p>}

        {preview && (
          <>
            {preview.groups.map((g) => (
              <div key={g.toko.id} className="mt-5 rounded-xl border bg-white p-4 shadow-sm">
                <h2 className="font-semibold">🏪 {g.toko.nama}</h2>
                <ul className="mt-2 space-y-1 text-sm">
                  {g.items.map((it) => (
                    <li key={it.produkId} className="flex justify-between">
                      <span>{it.nama} × {it.qty}</span>
                      <span>{rupiah(it.subtotal)}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-2 border-t pt-2 text-sm">
                  <div className="flex justify-between"><span>Subtotal item</span><span>{rupiah(g.subtotalItem)}</span></div>
                  <div className="flex justify-between"><span>Ongkir ({g.toko.nama})</span><span>{rupiah(g.ongkir)}</span></div>
                  <div className="flex justify-between font-semibold">
                    <span>Total sub-order</span><span>{rupiah(g.subtotalItem + g.ongkir)}</span>
                  </div>
                </div>
              </div>
            ))}
            <div className="mt-5 rounded-xl border bg-white p-4 shadow-sm">
              <div className="flex justify-between text-sm"><span>Subtotal item</span><span>{rupiah(preview.subtotalItem)}</span></div>
              <div className="flex justify-between text-sm"><span>Total ongkir ({preview.groups.length} vendor)</span><span>{rupiah(preview.ongkirTotal)}</span></div>
              <div className="mt-1 flex justify-between border-t pt-2 text-lg font-bold">
                <span>Total bayar</span><span className="text-emerald-700">{rupiah(preview.total)}</span>
              </div>
              <button
                onClick={buatPesanan}
                disabled={loading}
                className="mt-4 w-full rounded-lg bg-emerald-600 px-6 py-3 font-semibold text-white disabled:bg-slate-300"
              >
                {loading ? "Memproses…" : "Buat Pesanan"}
              </button>
            </div>
          </>
        )}
      </main>
    </>
  );
}
