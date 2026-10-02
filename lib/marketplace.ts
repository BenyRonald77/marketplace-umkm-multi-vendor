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

/**
 * Pembayaran tunggal: pembeli membayar satu tagihan (order).
 * Setelah dikonfirmasi, dana dibagi ke saldo tiap vendor:
 *   komisi      = round((subtotalItem + ongkir) x pct / 100)  -> ledger platform
 *   bersihVendor = subtotalItem + ongkir - komisi             -> ledger vendor
 * Sub-order yang sudah dibatalkan sebelum bayar tidak ikut dihitung.
 */
export async function bayarOrder(orderId: number, metode = "transfer") {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { subOrders: { orderBy: { id: "asc" } } },
  });
  if (!order) throw new BizError(404, "order tidak ditemukan");
  if (order.status !== "menunggu_pembayaran")
    throw new BizError(409, `order sudah berstatus "${order.status}"`);

  const aktif = order.subOrders.filter((s) => s.status !== "dibatalkan");
  if (aktif.length === 0) throw new BizError(422, "semua sub-order sudah dibatalkan");

  const pct = await getKomisiPersen();
  const totalBayar = aktif.reduce((s, x) => s + x.subtotalItem + x.ongkir, 0);
  let totalKomisi = 0;

  for (const s of aktif) {
    const bruto = s.subtotalItem + s.ongkir;
    const komisi = Math.round((bruto * pct) / 100);
    const bersih = bruto - komisi;
    totalKomisi += komisi;

    await prisma.subOrder.update({
      where: { id: s.id },
      data: { komisi, bersihVendor: bersih, dibayar: true },
    });
    await prisma.vendorLedger.create({
      data: {
        tokoId: s.tokoId,
        subOrderId: s.id,
        jenis: "kredit_penjualan",
        jumlah: bersih,
        keterangan: `Penjualan ${order.kode} (komisi ${pct}%)`,
        createdAt: nowISO(),
      },
    });
    await prisma.platformLedger.create({
      data: {
        subOrderId: s.id,
        jenis: "komisi",
        jumlah: komisi,
        keterangan: `Komisi ${pct}% dari ${order.kode} (toko #${s.tokoId})`,
        createdAt: nowISO(),
      },
    });
  }

  await prisma.pembayaran.create({
    data: { orderId, jumlah: totalBayar, metode, createdAt: nowISO() },
  });
  await prisma.order.update({
    where: { id: orderId },
    data: { status: "lunas", total: totalBayar },
  });

  return {
    orderId,
    kode: order.kode,
    totalBayar,
    totalKomisi,
    komisiPersen: pct,
    subOrderDibayar: aktif.length,
  };
}

/** Saldo vendor = jumlah semua mutasi ledger vendor (derived). */
export async function saldoToko(tokoId: number): Promise<number> {
  const agg = await prisma.vendorLedger.aggregate({
    where: { tokoId },
    _sum: { jumlah: true },
  });
  return agg._sum.jumlah ?? 0;
}

const TRANSISI: Record<string, string[]> = {
  menunggu_bayar: ["diproses"],
  diproses: ["dikirim"],
  dikirim: ["selesai"],
  selesai: [],
  dibatalkan: [],
};

/** Maju satu langkah: menunggu_bayar -> diproses -> dikirim -> selesai. */
export async function ubahStatusSubOrder(id: number, status: string) {
  const s = await prisma.subOrder.findUnique({ where: { id } });
  if (!s) throw new BizError(404, "sub-order tidak ditemukan");
  if (status === "dibatalkan")
    throw new BizError(400, "pembatalan lewat endpoint /batal");
  const boleh = TRANSISI[s.status] ?? [];
  if (!boleh.includes(status))
    throw new BizError(409, `transisi status ${s.status} -> ${status} tidak diizinkan`);
  return prisma.subOrder.update({ where: { id }, data: { status } });
}

/**
 * Batalkan SATU sub-order tanpa mengganggu sub-order lain:
 * - stok tiap item dikembalikan (increment),
 * - bila sudah dibayar: ledger vendor dikoreksi (-bersihVendor) dan
 *   ledger platform dikoreksi (-komisi),
 * - bila order belum dibayar dan semua sub-order batal -> order ikut dibatalkan.
 */
export async function batalkanSubOrder(id: number) {
  const s = await prisma.subOrder.findUnique({
    where: { id },
    include: { items: true, order: { select: { kode: true, status: true } } },
  });
  if (!s) throw new BizError(404, "sub-order tidak ditemukan");
  if (s.status === "dibatalkan") throw new BizError(409, "sub-order sudah dibatalkan");
  if (s.status === "selesai")
    throw new BizError(409, "sub-order yang sudah selesai tidak bisa dibatalkan");

  for (const it of s.items) {
    await prisma.produk.updateMany({
      where: { id: it.produkId },
      data: { stok: { increment: it.qty } },
    });
  }

  let koreksi = null;
  if (s.dibayar) {
    await prisma.vendorLedger.create({
      data: {
        tokoId: s.tokoId,
        subOrderId: s.id,
        jenis: "koreksi_batal",
        jumlah: -s.bersihVendor,
        keterangan: `Koreksi pembatalan ${s.order.kode}`,
        createdAt: nowISO(),
      },
    });
    await prisma.platformLedger.create({
      data: {
        subOrderId: s.id,
        jenis: "koreksi_batal",
        jumlah: -s.komisi,
        keterangan: `Koreksi komisi pembatalan ${s.order.kode}`,
        createdAt: nowISO(),
      },
    });
    koreksi = { saldoVendor: -s.bersihVendor, komisi: -s.komisi };
  }

  const updated = await prisma.subOrder.update({
    where: { id },
    data: { status: "dibatalkan", dibayar: false },
  });

  const sisa = await prisma.subOrder.count({
    where: { orderId: s.orderId, status: { not: "dibatalkan" } },
  });
  let orderBatal = false;
  if (sisa === 0 && s.order.status === "menunggu_pembayaran") {
    await prisma.order.update({ where: { id: s.orderId }, data: { status: "dibatalkan" } });
    orderBatal = true;
  }
  return { subOrder: updated, koreksi, orderIkutBatal: orderBatal };
}
