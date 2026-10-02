import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { nowISO } from "@/lib/format";

export async function GET() {
  const rows = await prisma.toko.findMany({ orderBy: { id: "asc" } });
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body.nama !== "string" || !body.nama.trim()) {
    return NextResponse.json({ error: "nama toko wajib diisi" }, { status: 400 });
  }
  if (!body.pemilik || typeof body.pemilik !== "string" || !body.pemilik.trim()) {
    return NextResponse.json({ error: "pemilik wajib diisi" }, { status: 400 });
  }
  const tarifOngkir = Number(body.tarifOngkir ?? 10000);
  if (!Number.isInteger(tarifOngkir) || tarifOngkir < 0) {
    return NextResponse.json({ error: "tarifOngkir harus bilangan bulat >= 0" }, { status: 400 });
  }
  const created = await prisma.toko.create({
    data: {
      nama: body.nama.trim(),
      deskripsi: typeof body.deskripsi === "string" ? body.deskripsi : "",
      pemilik: body.pemilik.trim(),
      tarifOngkir,
      createdAt: nowISO(),
    },
  });
  return NextResponse.json(created, { status: 201 });
}
