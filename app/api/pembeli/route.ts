import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { nowISO } from "@/lib/format";

export async function GET() {
  const rows = await prisma.pembeli.findMany({ orderBy: { id: "asc" } });
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body.nama !== "string" || !body.nama.trim())
    return NextResponse.json({ error: "nama wajib diisi" }, { status: 400 });
  if (typeof body.email !== "string" || !body.email.includes("@"))
    return NextResponse.json({ error: "email tidak valid" }, { status: 400 });
  const ada = await prisma.pembeli.findUnique({ where: { email: body.email.trim() } });
  if (ada) return NextResponse.json({ error: "email sudah terdaftar" }, { status: 409 });
  const created = await prisma.pembeli.create({
    data: { nama: body.nama.trim(), email: body.email.trim(), createdAt: nowISO() },
  });
  return NextResponse.json(created, { status: 201 });
}
