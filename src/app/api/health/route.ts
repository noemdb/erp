import { NextResponse } from "next/server";
import { checkHealth } from "@/lib/health";

export async function GET() {
  const h = await checkHealth();
  return NextResponse.json({ data: h }, { status: h.status === "ok" ? 200 : 503 });
}
