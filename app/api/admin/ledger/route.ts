import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const rows = await prisma.platformLedger.findMany({
    orderBy: { id: "desc" },
    take: 100,
  });
  const total = rows.reduce((s, r) => s + r.jumlah, 0);
  return NextResponse.json({ totalKomisiBersih: total, entries: rows });
}
