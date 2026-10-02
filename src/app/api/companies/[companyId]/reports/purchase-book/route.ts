import { NextResponse } from "next/server";
import { getSessionUser } from "@/modules/identity/session";
import { authorize } from "@/modules/tenancy/authorize";
import { getPurchaseBook } from "@/modules/fiscal-docs/service";

/** Descarga CSV del Libro de Compras. Neutraliza inyección (=+-@). PDF/Excel fiel en F5. */
function cell(v: string): string {
  const t = /^[=+\-@]/.test(v) ? `'${v}` : v;
  return `"${t.replace(/"/g, '""')}"`;
}

export async function GET(req: Request, { params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Inicia sesión." } }, { status: 401 });
  const auth = await authorize(companyId, user.id, "reports.read");
  if (!auth.ok) return NextResponse.json({ error: { code: "FORBIDDEN", message: "Sin acceso." } }, { status: 403 });

  const periodId = new URL(req.url).searchParams.get("periodId") ?? undefined;
  const rows = await getPurchaseBook({ companyId, userId: user.id }, periodId);
  const head = "fecha_fiscal,rif,razon_social,factura,control,base,iva,total";
  const body = rows.map((r) => [r.fechaFiscal, r.rif, r.razonSocial, r.docNumber, r.controlNumber, r.baseImponible, r.ivaCausado, r.total].map(cell).join(",")).join("\n");
  return new Response(`${head}\n${body}`, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": "attachment; filename=libro-compras.csv" },
  });
}
