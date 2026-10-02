import { NextResponse } from "next/server";
import { getSessionUser } from "@/modules/identity/session";
import { authorize } from "@/modules/tenancy/authorize";

/**
 * Plantilla CSV por tipo (columnas canónicas del parser validate.ts/z.ts).
 * Fechas DD/MM/AAAA o AAAA-MM-DD; decimales con punto o coma.
 */
const TEMPLATES: Record<string, { filename: string; csv: string }> = {
  purchases: {
    filename: "plantilla-compras.csv",
    csv: [
      "fecha,rif,razon_social,factura,control,base_imponible,iva,total",
      "05/09/2026,J-12345678-9,Proveedor Ejemplo CA,F-0001,C-0001,1000.00,160.00,1160.00",
    ].join("\n"),
  },
  sales: {
    filename: "plantilla-ventas.csv",
    csv: [
      "fecha,rif,razon_social,factura,control,base_imponible,iva,total",
      "05/09/2026,J-87654321-0,Cliente Ejemplo CA,V-0001,C-0001,2000.00,320.00,2320.00",
    ].join("\n"),
  },
  z_reports: {
    filename: "plantilla-reporte-z.csv",
    csv: [
      "fecha,z,maquina,primera,ultima,gravadas,exentas,iva,total",
      "05/09/2026,000123,ABC12345,000101,000150,50000.00,2000.00,8000.00,60000.00",
    ].join("\n"),
  },
};

/** Descarga la plantilla CSV del tipo indicado (?kind=purchases|sales|z_reports). */
export async function GET(req: Request, { params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Inicia sesión." } }, { status: 401 });
  const auth = await authorize(companyId, user.id, "reports.read");
  if (!auth.ok) return NextResponse.json({ error: { code: "FORBIDDEN", message: "Sin acceso." } }, { status: 403 });

  const kind = new URL(req.url).searchParams.get("kind") ?? "";
  const tpl = TEMPLATES[kind];
  if (!tpl)
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Tipo sin plantilla: usa purchases, sales o z_reports." } },
      { status: 400 }
    );
  return new Response(`\uFEFF${tpl.csv}\n`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename=${tpl.filename}`,
    },
  });
}
