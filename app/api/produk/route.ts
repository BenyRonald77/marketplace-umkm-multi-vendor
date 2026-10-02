import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { nowISO } from "@/lib/format";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const tokoId = sp.get("tokoId");
  const kategori = sp.get("kategori");
  const q = sp.get("q");
  const where: Record<string, unknown> = {};
  if (tokoId) {
    const id = Number(tokoId);
    if (!Number.isInteger(id)) return NextResponse.json({ error: "tokoId tidak valid" }, { status: 400 });
    where.tokoId = id;
  }
  if (kategori) where.kategori = kategori;
  if (q) where.nama = { contains: q };
  const rows = await prisma.produk.findMany({
    where: where as never,
    include: { toko: { select: { id: true, nama: true, tarifOngkir: true, statusAktif: true } } },
    orderBy: { id: "asc" },
  });
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "body JSON wajib" }, { status: 400 });
  const tokoId = Number(body.tokoId);
  if (!Number.isInteger(tokoId)) return NextResponse.json({ error: "tokoId wajib" }, { status: 400 });
  const toko = await prisma.toko.findUnique({ where: { id: tokoId } });
  if (!toko) return NextResponse.json({ error: "toko tidak ditemukan" }, { status: 404 });
  if (typeof body.nama !== "string" || !body.nama.trim())
    return NextResponse.json({ error: "nama produk wajib diisi" }, { status: 400 });
  const harga = Number(body.harga);
  if (!Number.isInteger(harga) || harga <= 0)
    return NextResponse.json({ error: "harga harus bilangan bulat > 0" }, { status: 400 });
  const stok = Number(body.stok ?? 0);
  if (!Number.isInteger(stok) || stok < 0)
    return NextResponse.json({ error: "stok harus bilangan bulat >= 0" }, { status: 400 });
  const created = await prisma.produk.create({
    data: {
      tokoId,
      nama: body.nama.trim(),
      harga,
      stok,
      kategori: typeof body.kategori === "string" && body.kategori ? body.kategori : "Lainnya",
      createdAt: nowISO(),
    },
  });
  return NextResponse.json(created, { status: 201 });
}
