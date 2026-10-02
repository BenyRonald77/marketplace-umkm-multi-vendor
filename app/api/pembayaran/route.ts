import { NextRequest, NextResponse } from "next/server";
import { bayarOrder, BizError } from "@/lib/marketplace";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const orderId = Number(body?.orderId);
  if (!Number.isInteger(orderId))
    return NextResponse.json({ error: "orderId tidak valid" }, { status: 400 });
  const metode = typeof body?.metode === "string" && body.metode ? body.metode : "transfer";
  try {
    const hasil = await bayarOrder(orderId, metode);
    return NextResponse.json(hasil, { status: 201 });
  } catch (e) {
    if (e instanceof BizError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}
