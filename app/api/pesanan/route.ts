import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const pembeliId = Number(req.nextUrl.searchParams.get("pembeliId"));
  if (!Number.isInteger(pembeliId))
    return NextResponse.json({ error: "pembeliId tidak valid" }, { status: 400 });
  const orders = await prisma.order.findMany({
    where: { pembeliId },
    include: {
      subOrders: {
        include: { toko: { select: { id: true, nama: true } }, items: true },
        orderBy: { id: "asc" },
      },
      pembayarans: true,
    },
    orderBy: { id: "desc" },
  });
  return NextResponse.json(orders);
}
