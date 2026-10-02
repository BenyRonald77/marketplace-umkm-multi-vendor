import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { saldoToko } from "@/lib/marketplace";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = Number(params.id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "id tidak valid" }, { status: 400 });
  const toko = await prisma.toko.findUnique({ where: { id } });
  if (!toko) return NextResponse.json({ error: "toko tidak ditemukan" }, { status: 404 });

  const [saldo, subOrders, mutasi] = await Promise.all([
    saldoToko(id),
    prisma.subOrder.findMany({
      where: { tokoId: id },
      include: { order: { select: { kode: true, status: true } }, items: true },
      orderBy: { id: "desc" },
    }),
    prisma.vendorLedger.findMany({
      where: { tokoId: id },
      orderBy: { id: "desc" },
      take: 50,
    }),
  ]);
  return NextResponse.json({ toko, saldo, subOrders, mutasi });
}
