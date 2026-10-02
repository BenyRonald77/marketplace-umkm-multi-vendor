import { NextRequest, NextResponse } from "next/server";
import { checkout, BizError } from "@/lib/marketplace";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const pembeliId = Number(body?.pembeliId);
  if (!Number.isInteger(pembeliId))
    return NextResponse.json({ error: "pembeliId tidak valid" }, { status: 400 });
  try {
    const order = await checkout(pembeliId);
    return NextResponse.json(order, { status: 201 });
  } catch (e) {
    if (e instanceof BizError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}
