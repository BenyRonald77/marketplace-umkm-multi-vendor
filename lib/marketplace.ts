import { prisma } from "@/lib/prisma";
import { nowISO, today } from "@/lib/format";

export class BizError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

type CartItem = {
  id: number;
  qty: number;
  produk: {
    id: number;
    nama: string;
    harga: number;
    stok: number;
    statusAktif: boolean;
    tokoId: number;
    toko: { id: number; nama: string; tarifOngkir: number; statusAktif: boolean };
  };
};

async function ambilKeranjang(pembeliId: number): Promise<CartItem[]> {
  const pembeli = await prisma.pembeli.findUnique({ where: { id: pembeliId } });
  if (!pembeli) throw new BizError(404, "pembeli tidak ditemukan");
  const items = await prisma.keranjangItem.findMany({
    where: { pembeliId },
    include: { produk: { include: { toko: true } } },
    orderBy: { id: "asc" },
  });
  if (items.length === 0) throw new BizError(422, "keranjang kosong");
  for (const it of items) {
    if (!it.produk.statusAktif || !it.produk.toko.statusAktif)
      throw new BizError(409, `produk "${it.produk.nama}" / tokonya sedang nonaktif`);
  }
  return items as CartItem[];
}

export type PreviewGroup = {
  toko: { id: number; nama: string; tarifOngkir: number };
  items: { produkId: number; nama: string; harga: number; qty: number; subtotal: number }[];
  subtotalItem: number;
  ongkir: number;
};

export async function previewCheckout(pembeliId: number) {
  const items = await ambilKeranjang(pembeliId);
  const groups = kelompokkan(items);
  const subtotalItem = groups.reduce((s, g) => s + g.subtotalItem, 0);
  const ongkirTotal = groups.reduce((s, g) => s + g.ongkir, 0);
  return { groups, subtotalItem, ongkirTotal, total: subtotalItem + ongkirTotal };
}

function kelompokkan(items: CartItem[]): PreviewGroup[] {
  const map = new Map<number, PreviewGroup>();
  for (const it of items) {
    const t = it.produk.toko;
    if (!map.has(t.id)) {
      map.set(t.id, {
        toko: { id: t.id, nama: t.nama, tarifOngkir: t.tarifOngkir },
        items: [],
        subtotalItem: 0,
        ongkir: t.tarifOngkir,
      });
    }
    const g = map.get(t.id)!;
    const subtotal = it.qty * it.produk.harga;
    g.items.push({
      produkId: it.produk.id,
      nama: it.produk.nama,
      harga: it.produk.harga,
      qty: it.qty,
      subtotal,
    });
    g.subtotalItem += subtotal;
  }
  return Array.from(map.values());
}

function kodeOrder(seq: number) {
  return `ORD-${today().replace(/-/g, "")}-${String(seq).padStart(4, "0")}`;
}

/**
 * Checkout: kurangi stok atomik per produk (conditional updateMany),
 * pecah keranjang jadi sub-order per vendor.
 *
 * CATATAN ATOMICITY: interactive prisma.$transaction + SQLite (better-sqlite3)
 * tidak tahan konkurensi (satu koneksi = transaksi bersarang error/lock).
 * Karena itu pengurangan stok memakai single-statement conditional updateMany
 * (atomik di level SQL: WHERE id=? AND stok>=qty). Pola:
 *  1. pre-check stok (gagal cepat, tanpa write),
 *  2. decrement kondisional satu per satu; bila ada yang gagal (0 row -> race),
 *     decrement yang sudah berhasil di-rollback (increment kembali),
 *  3. baru tulis Order/SubOrder/OrderItem + kosongkan keranjang.
 * Hasil: stok kurang -> 409 dan TIDAK ADA sub-order yang tercipta.
 */
export async function checkout(pembeliId: number) {
  const items = await ambilKeranjang(pembeliId);

  // 1. pre-check: gagal cepat sebelum ada write apa pun
  const kurang = items.filter((it) => it.qty > it.produk.stok);
  if (kurang.length > 0) {
    throw new BizError(
      409,
      "stok tidak cukup: " +
        kurang.map((it) => `"${it.produk.nama}" (minta ${it.qty}, tersedia ${it.produk.stok})`).join(", ")
    );
  }

  // 2. decrement atomik per produk; rollback bila ada yang gagal (race)
  const berhasil: { produkId: number; qty: number }[] = [];
  for (const it of items) {
    const r = await prisma.produk.updateMany({
      where: { id: it.produk.id, stok: { gte: it.qty } },
      data: { stok: { decrement: it.qty } },
    });
    if (r.count === 0) {
      for (const b of berhasil) {
        await prisma.produk.updateMany({
          where: { id: b.produkId },
          data: { stok: { increment: b.qty } },
        });
      }
      throw new BizError(
        409,
        `stok "${it.produk.nama}" berubah saat checkout, silakan coba lagi`
      );
    }
    berhasil.push({ produkId: it.produk.id, qty: it.qty });
  }

  // 3. tulis order + sub-order per vendor
  const groups = kelompokkan(items);
  const subtotalItem = groups.reduce((s, g) => s + g.subtotalItem, 0);
  const ongkirTotal = groups.reduce((s, g) => s + g.ongkir, 0);
  const seq = (await prisma.order.count()) + 1;

  const order = await prisma.order.create({
    data: {
      kode: kodeOrder(seq),
      pembeliId,
      total: subtotalItem + ongkirTotal,
      ongkirTotal,
      status: "menunggu_pembayaran",
      createdAt: nowISO(),
    },
  });

  for (const g of groups) {
    const sub = await prisma.subOrder.create({
      data: {
        orderId: order.id,
        tokoId: g.toko.id,
        ongkir: g.ongkir,
        subtotalItem: g.subtotalItem,
        status: "menunggu_bayar",
        createdAt: nowISO(),
      },
    });
    for (const it of g.items) {
      await prisma.orderItem.create({
        data: {
          subOrderId: sub.id,
          produkId: it.produkId,
          namaProduk: it.nama,
          qty: it.qty,
          hargaSatuan: it.harga,
          subtotal: it.subtotal,
        },
      });
    }
  }

  await prisma.keranjangItem.deleteMany({ where: { pembeliId } });

  return prisma.order.findUnique({
    where: { id: order.id },
    include: {
      subOrders: { include: { toko: true, items: true }, orderBy: { id: "asc" } },
    },
  });
}

export async function getKomisiPersen(): Promise<number> {
  const c = await prisma.config.findUnique({ where: { key: "komisi_persen" } });
  const v = Number(c?.value ?? "5");
  return Number.isFinite(v) && v >= 0 ? v : 5;
}
