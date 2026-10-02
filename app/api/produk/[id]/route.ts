import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = Number(params.id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "id tidak valid" }, { status: 400 });
  const p = await prisma.produk.findUnique({
    where: { id },
    include: { toko: { select: { id: true, nama: true, tarifOngkir: true, statusAktif: true } } },
  });
  if (!p) return NextResponse.json({ error: "produk tidak ditemukan" }, { status: 404 });
  return NextResponse.json(p);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = Number(params.id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "id tidak valid" }, { status: 400 });
  const ada = await prisma.produk.findUnique({ where: { id } });
  if (!ada) return NextResponse.json({ error: "produk tidak ditemukan" }, { status: 404 });
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "body JSON wajib" }, { status: 400 });

  const data: Record<string, unknown> = {};
  if (body.nama !== undefined) {
    if (typeof body.nama !== "string" || !body.nama.trim())
      return NextResponse.json({ error: "nama tidak valid" }, { status: 400 });
    data.nama = body.nama.trim();
  }
  if (body.harga !== undefined) {
    const v = Number(body.harga);
    if (!Number.isInteger(v) || v <= 0)
      return NextResponse.json({ error: "harga harus bilangan bulat > 0" }, { status: 400 });
    data.harga = v;
  }
  if (body.stok !== undefined) {
    const v = Number(body.stok);
    if (!Number.isInteger(v) || v < 0)
      return NextResponse.json({ error: "stok harus bilangan bulat >= 0" }, { status: 400 });
    data.stok = v;
  }
  if (body.kategori !== undefined) {
    if (typeof body.kategori !== "string" || !body.kategori.trim())
      return NextResponse.json({ error: "kategori tidak valid" }, { status: 400 });
    data.kategori = body.kategori.trim();
  }
  if (body.statusAktif !== undefined) {
    if (typeof body.statusAktif !== "boolean")
      return NextResponse.json({ error: "statusAktif harus boolean" }, { status: 400 });
    data.statusAktif = body.statusAktif;
  }
  const updated = await prisma.produk.update({ where: { id }, data: data as never });
  return NextResponse.json(updated);
}
