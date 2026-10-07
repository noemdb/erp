import { NextResponse } from "next/server";
import { getSessionUser } from "@/modules/identity/session";
import { authorize } from "@/modules/tenancy/authorize";
import { listDecisions, toDecisionesCsv, type DecisionCsvRow } from "@/modules/rdf";

/** Descarga CSV de decisiones fiscales. Neutraliza inyección (=+-@). */
export async function GET(_req: Request, { params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Inicia sesión." } }, { status: 401 });
  const auth = await authorize(companyId, user.id, "reports.read");
  if (!auth.ok) return NextResponse.json({ error: { code: "FORBIDDEN", message: "Sin acceso." } }, { status: 403 });

  const rows = await listDecisions({ companyId, userId: user.id });
  const csvRows: DecisionCsvRow[] = rows.map((r) => ({
    codigo: r.codigo,
    estado: r.status ?? "",
    gap: r.gap ?? "",
    titulo: r.titulo ?? "",
    resultadoEsperado: r.resultadoEsperado ?? "",
    firmante: r.firmanteNombre ?? "",
    firmadoEn: r.firmadoEn ? new Date(r.firmadoEn).toISOString().slice(0, 10) : "",
    sha256: r.contentSha256 ?? "",
  }));
  return new Response(toDecisionesCsv(csvRows), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": "attachment; filename=decisiones-fiscales.csv" },
  });
}
