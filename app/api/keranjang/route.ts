import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

async function getPembeli(pembeliId: unknown) {
  const id = Number(pembeliId);
  if (!Number.isInteger(id)) return null;
  return prisma.pembeli.findUnique({ where: { id } });
}

export async function GET(req: NextRequest) {
  const pembeli = await getPembeli(req.nextUrl.searchParams.get("pembeliId"));
  if (!pembeli) return NextResponse.json({ error: "pembeliId tidak valid" }, { status: 400 });
  const items = await prisma.keranjangItem.findMany({
    where: { pembeliId: pembeli.id },
    include: {
      produk: {
        include: {
          toko: { select: { id: true, nama: true, tarifOngkir: true, statusAktif: true } },
        },
      },
    },
    orderBy: { id: "asc" },
  });
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "body JSON wajib" }, { status: 400 });
  const pembeli = await getPembeli(body.pembeliId);
  if (!pembeli) return NextResponse.json({ error: "pembeli tidak ditemukan" }, { status: 404 });

  const produkId = Number(body.produkId);
  const qty = Number(body.qty ?? 1);
  if (!Number.isInteger(produkId)) return NextResponse.json({ error: "produkId tidak valid" }, { status: 400 });
  if (!Number.isInteger(qty) || qty <= 0)
    return NextResponse.json({ error: "qty harus bilangan bulat > 0" }, { status: 400 });

  const produk = await prisma.produk.findUnique({
    where: { id: produkId },
    include: { toko: true },
  });
  if (!produk) return NextResponse.json({ error: "produk tidak ditemukan" }, { status: 404 });
  if (!produk.statusAktif || !produk.toko.statusAktif)
    return NextResponse.json({ error: "produk/toko sedang nonaktif" }, { status: 409 });

  const lama = await prisma.keranjangItem.findUnique({
    where: { pembeliId_produkId: { pembeliId: pembeli.id, produkId } },
  });
  const qtyBaru = (lama?.qty ?? 0) + qty;
  if (qtyBaru > produk.stok)
    return NextResponse.json(
      { error: `stok tidak cukup (tersedia ${produk.stok})` },
      { status: 409 }
    );

  const item = lama
    ? await prisma.keranjangItem.update({ where: { id: lama.id }, data: { qty: qtyBaru } })
    : await prisma.keranjangItem.create({
        data: { pembeliId: pembeli.id, produkId, qty },
      });
  return NextResponse.json(item, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "body JSON wajib" }, { status: 400 });
  const pembeli = await getPembeli(body.pembeliId);
  if (!pembeli) return NextResponse.json({ error: "pembeli tidak ditemukan" }, { status: 404 });
  const produkId = Number(body.produkId);
  const qty = Number(body.qty);
  if (!Number.isInteger(produkId) || !Number.isInteger(qty) || qty < 0)
    return NextResponse.json({ error: "produkId/qty tidak valid" }, { status: 400 });

  const lama = await prisma.keranjangItem.findUnique({
    where: { pembeliId_produkId: { pembeliId: pembeli.id, produkId } },
  });
  if (!lama) return NextResponse.json({ error: "item tidak ada di keranjang" }, { status: 404 });

  if (qty === 0) {
    await prisma.keranjangItem.delete({ where: { id: lama.id } });
    return NextResponse.json({ dihapus: true });
  }
  const produk = await prisma.produk.findUnique({ where: { id: produkId } });
  if (!produk) return NextResponse.json({ error: "produk tidak ditemukan" }, { status: 404 });
  if (qty > produk.stok)
    return NextResponse.json(
      { error: `stok tidak cukup (tersedia ${produk.stok})` },
      { status: 409 }
    );
  const updated = await prisma.keranjangItem.update({ where: { id: lama.id }, data: { qty } });
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const pembeli = await getPembeli(sp.get("pembeliId"));
  if (!pembeli) return NextResponse.json({ error: "pembeliId tidak valid" }, { status: 400 });
  const produkId = Number(sp.get("produkId"));
  if (!Number.isInteger(produkId)) return NextResponse.json({ error: "produkId tidak valid" }, { status: 400 });
  const lama = await prisma.keranjangItem.findUnique({
    where: { pembeliId_produkId: { pembeliId: pembeli.id, produkId } },
  });
  if (!lama) return NextResponse.json({ error: "item tidak ada di keranjang" }, { status: 404 });
  await prisma.keranjangItem.delete({ where: { id: lama.id } });
  return NextResponse.json({ dihapus: true });
}
