import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = Number(params.id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "id tidak valid" }, { status: 400 });
  const toko = await prisma.toko.findUnique({
    where: { id },
    include: { produks: { orderBy: { id: "asc" } } },
  });
  if (!toko) return NextResponse.json({ error: "toko tidak ditemukan" }, { status: 404 });
  return NextResponse.json(toko);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = Number(params.id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "id tidak valid" }, { status: 400 });
  const ada = await prisma.toko.findUnique({ where: { id } });
  if (!ada) return NextResponse.json({ error: "toko tidak ditemukan" }, { status: 404 });
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "body JSON wajib" }, { status: 400 });

  const data: Record<string, unknown> = {};
  if (body.nama !== undefined) {
    if (typeof body.nama !== "string" || !body.nama.trim())
      return NextResponse.json({ error: "nama tidak valid" }, { status: 400 });
    data.nama = body.nama.trim();
  }
  if (body.deskripsi !== undefined) {
    if (typeof body.deskripsi !== "string")
      return NextResponse.json({ error: "deskripsi tidak valid" }, { status: 400 });
    data.deskripsi = body.deskripsi;
  }
  if (body.pemilik !== undefined) {
    if (typeof body.pemilik !== "string" || !body.pemilik.trim())
      return NextResponse.json({ error: "pemilik tidak valid" }, { status: 400 });
    data.pemilik = body.pemilik.trim();
  }
  if (body.tarifOngkir !== undefined) {
    const v = Number(body.tarifOngkir);
    if (!Number.isInteger(v) || v < 0)
      return NextResponse.json({ error: "tarifOngkir harus bilangan bulat >= 0" }, { status: 400 });
    data.tarifOngkir = v;
  }
  if (body.statusAktif !== undefined) {
    if (typeof body.statusAktif !== "boolean")
      return NextResponse.json({ error: "statusAktif harus boolean" }, { status: 400 });
    data.statusAktif = body.statusAktif;
  }
  const updated = await prisma.toko.update({ where: { id }, data: data as never });
  return NextResponse.json(updated);
}
