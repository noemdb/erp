import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/modules/identity/session";
import { authorize } from "@/modules/tenancy/authorize";
import { getCorrelativo } from "@/modules/withholdings/correlativo";

const QuerySchema = z.object({
  kind: z.enum(["iva", "islr"]),
  periodId: z.string().uuid().optional(),
});

/** Correlativo con huecos, totales por estado y cruce contra `document_series`. Solo lectura. */
export async function GET(req: Request, { params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Inicia sesión." } }, { status: 401 });
  const auth = await authorize(companyId, user.id, "reports.read");
  if (!auth.ok) return NextResponse.json({ error: { code: "FORBIDDEN", message: "Sin acceso." } }, { status: 403 });

  const q = Object.fromEntries(new URL(req.url).searchParams.entries());
  const parsed = QuerySchema.safeParse(q);
  if (!parsed.success)
    return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "kind debe ser iva o islr." } }, { status: 400 });

  const report = await getCorrelativo({ companyId, userId: user.id }, parsed.data.kind, parsed.data.periodId);
  return NextResponse.json({ data: report });
}
