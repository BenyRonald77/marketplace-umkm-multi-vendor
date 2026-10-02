import { NextRequest, NextResponse } from "next/server";
import { batalkanSubOrder, BizError } from "@/lib/marketplace";

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = Number(params.id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "id tidak valid" }, { status: 400 });
  try {
    const hasil = await batalkanSubOrder(id);
    return NextResponse.json(hasil);
  } catch (e) {
    if (e instanceof BizError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}
