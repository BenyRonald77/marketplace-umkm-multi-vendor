import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getKomisiPersen } from "@/lib/marketplace";

export async function GET() {
  const persen = await getKomisiPersen();
  return NextResponse.json({ komisi_persen: persen });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const v = Number(body?.komisiPersen);
  if (!Number.isFinite(v) || v < 0 || v > 100)
    return NextResponse.json({ error: "komisiPersen harus angka 0-100" }, { status: 400 });
  await prisma.config.upsert({
    where: { key: "komisi_persen" },
    update: { value: String(v) },
    create: { key: "komisi_persen", value: String(v) },
  });
  return NextResponse.json({ komisi_persen: v });
}
