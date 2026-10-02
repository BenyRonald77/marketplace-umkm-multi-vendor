import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getKomisiPersen } from "@/lib/marketplace";

export async function GET() {
  const [komisiAgg, orders, subOrders, tokos, persen] = await Promise.all([
    prisma.platformLedger.aggregate({ _sum: { jumlah: true } }),
    prisma.order.count(),
    prisma.subOrder.count(),
    prisma.toko.count(),
    getKomisiPersen(),
  ]);
  return NextResponse.json({
    komisiPersen: persen,
    totalKomisiBersih: komisiAgg._sum.jumlah ?? 0,
    jumlahOrder: orders,
    jumlahSubOrder: subOrders,
    jumlahToko: tokos,
  });
}
