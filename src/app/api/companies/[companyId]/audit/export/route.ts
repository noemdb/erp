import { NextResponse } from "next/server";
import { getSessionUser } from "@/modules/identity/session";
import { authorize } from "@/modules/tenancy/authorize";
import { listAuditEvents } from "@/modules/audit/queries";

export async function GET(req: Request, { params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Inicia sesión." } }, { status: 401 });
  const auth = await authorize(companyId, user.id, "audit.read");
  if (!auth.ok) {
    // auditor y resto con reports.read pueden exportar bitácora de sus empresas
    const fallback = await authorize(companyId, user.id, "reports.read");
    if (!fallback.ok) return NextResponse.json({ error: { code: "FORBIDDEN", message: "Sin acceso." } }, { status: 403 });
  }
  const sp = new URL(req.url).searchParams;
  const rows = await listAuditEvents(
    { companyId, userId: user.id },
    { entityType: sp.get("entityType") ?? undefined, entityId: sp.get("entityId") ?? undefined },
  );
  const cell = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const body = rows.map((r) => [r.occurredAt?.toISOString() ?? "", r.action, r.entityType, r.entityId, r.reason ?? ""].map(cell).join(",")).join("\n");
  return new Response(`cuando,accion,entidad,id,motivo\n${body}`, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": "attachment; filename=bitacora.csv" },
  });
}
