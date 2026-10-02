import { NextResponse } from "next/server";
import { getSessionUser } from "@/modules/identity/session";
import { authorize } from "@/modules/tenancy/authorize";
import { uploadImport } from "@/modules/imports/service";
import { checkRateLimit } from "@/lib/rate-limit";

/** Subida CSV (multipart: kind, sourceSystem, file). Validación de tipo por contenido mínimo. */
export async function POST(req: Request, { params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Inicia sesión." } }, { status: 401 });
  const auth = await authorize(companyId, user.id, "imports.run");
  if (!auth.ok) return NextResponse.json({ error: { code: "FORBIDDEN", message: "Sin permiso." } }, { status: 403 });
  if (!checkRateLimit(`upload:${user.id}`, 20, 60_000))
    return NextResponse.json({ error: { code: "RATE_LIMITED", message: "Demasiadas subidas." } }, { status: 429 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Falta archivo." } }, { status: 400 });
  const bytes = Buffer.from(await file.arrayBuffer());
  // Tipo por contenido, no por extensión: debe parecer texto (CSV) no binario.
  if (bytes.includes(0)) return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "El archivo no parece CSV de texto." } }, { status: 400 });

  const res = await uploadImport(
    { companyId, userId: user.id },
    { kind: String(form.get("kind")), sourceSystem: String(form.get("sourceSystem")), originalName: file.name || "archivo.csv" },
    bytes,
  );
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 });
  return NextResponse.json({ data: res });
}
