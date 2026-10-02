import { NextRequest, NextResponse } from "next/server";
import { previewCheckout, BizError } from "@/lib/marketplace";

export async function GET(req: NextRequest) {
  const pembeliId = Number(req.nextUrl.searchParams.get("pembeliId"));
  if (!Number.isInteger(pembeliId))
    return NextResponse.json({ error: "pembeliId tidak valid" }, { status: 400 });
  try {
    return NextResponse.json(await previewCheckout(pembeliId));
  } catch (e) {
    if (e instanceof BizError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}
