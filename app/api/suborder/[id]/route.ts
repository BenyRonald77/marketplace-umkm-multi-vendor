import { NextRequest, NextResponse } from "next/server";
import { ubahStatusSubOrder, BizError } from "@/lib/marketplace";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = Number(params.id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "id tidak valid" }, { status: 400 });
  const body = await req.json().catch(() => null);
  const status = body?.status;
  if (typeof status !== "string" || !status)
    return NextResponse.json({ error: "status wajib diisi" }, { status: 400 });
  try {
    const updated = await ubahStatusSubOrder(id, status);
    return NextResponse.json(updated);
  } catch (e) {
    if (e instanceof BizError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}
