import { NextResponse } from "next/server";
import { getSessionUser } from "@/modules/identity/session";
import { authorize } from "@/modules/tenancy/authorize";
import { getIvaWithholdingsReport, toIvaWithholdingsCsv } from "@/modules/withholdings/issue-iva";

/** Descarga CSV del reporte de retenciones IVA. Neutraliza inyección (=+-@). PDF/Excel fiel en F5. */
export async function GET(req: Request, { params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Inicia sesión." } }, { status: 401 });
  const auth = await authorize(companyId, user.id, "reports.read");
  if (!auth.ok) return NextResponse.json({ error: { code: "FORBIDDEN", message: "Sin acceso." } }, { status: 403 });

  const periodId = new URL(req.url).searchParams.get("periodId") ?? undefined;
  const rows = await getIvaWithholdingsReport({ companyId, userId: user.id }, periodId);
  return new Response(toIvaWithholdingsCsv(rows), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": "attachment; filename=retenciones-iva.csv" },
  });
}
