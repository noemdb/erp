import { NextResponse } from "next/server";
import { getSessionUser } from "@/modules/identity/session";
import { authorize } from "@/modules/tenancy/authorize";
import { rejectedCsv } from "@/modules/imports/confirm";

export async function GET(_req: Request, { params }: { params: Promise<{ companyId: string; batchId: string }> }) {
  const { companyId, batchId } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Inicia sesión." } }, { status: 401 });
  const auth = await authorize(companyId, user.id, "imports.run");
  if (!auth.ok) return NextResponse.json({ error: { code: "FORBIDDEN", message: "Sin acceso." } }, { status: 403 });
  const res = await rejectedCsv({ companyId, userId: user.id }, batchId);
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: 404 });
  return new Response(res.csv, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": "attachment; filename=rechazadas.csv" },
  });
}
