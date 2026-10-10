import { NextResponse } from "next/server";
import { getSessionUser } from "@/modules/identity/session";
import { authorize } from "@/modules/tenancy/authorize";
import { getClosingPackage } from "@/modules/reporting/closing-package";

/** Manifiesto JSON del paquete de cierre del período (hashes por sección + resumen). Solo lectura. */
export async function GET(req: Request, { params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Inicia sesión." } }, { status: 401 });
  const auth = await authorize(companyId, user.id, "reports.read");
  if (!auth.ok) return NextResponse.json({ error: { code: "FORBIDDEN", message: "Sin acceso." } }, { status: 403 });

  const periodId = new URL(req.url).searchParams.get("periodId") ?? undefined;
  if (!periodId) return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "periodId requerido." } }, { status: 400 });
  const pkg = await getClosingPackage({ companyId, userId: user.id }, periodId);
  const base = `/api/companies/${companyId}/reports`;
  return NextResponse.json({
    data: {
      ...pkg,
      downloads: {
        purchase_book: `${base}/purchase-book?periodId=${periodId}`,
        sales_book: `${base}/sales-book?periodId=${periodId}`,
        iva_withholdings: `${base}/iva-withholdings?periodId=${periodId}&format=csv`,
        islr_withholdings: `${base}/islr-withholdings?periodId=${periodId}&format=csv`,
      },
    },
  });
}
