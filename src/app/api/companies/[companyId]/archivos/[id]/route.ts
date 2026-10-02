import { NextResponse } from "next/server";
import { getSessionUser } from "@/modules/identity/session";
import { authorize } from "@/modules/tenancy/authorize";
import { getAttachment, checkTicket } from "@/modules/attachments/service";
import { readFsBlob, getBlobUrl } from "@/lib/storage";
import { record } from "@/modules/audit/record";
import { db } from "@/db/client";

/** Descarga con URL firmada: valida firma, expiración, permiso y empresa. */
export async function GET(req: Request, { params }: { params: Promise<{ companyId: string; id: string }> }) {
  const { companyId, id } = await params;
  const sp = new URL(req.url).searchParams;
  const exp = Number(sp.get("exp") ?? 0);
  const sig = sp.get("sig") ?? "";
  const uid = sp.get("uid") ?? "";
  const user = await getSessionUser();
  if (!user || user.id !== uid) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sesión inválida." } }, { status: 401 });
  if (!checkTicket(sig, id, companyId, uid, exp))
    return NextResponse.json({ error: { code: "FORBIDDEN", message: "Enlace inválido o vencido." } }, { status: 403 });
  const auth = await authorize(companyId, user.id, "reports.read");
  if (!auth.ok) return NextResponse.json({ error: { code: "FORBIDDEN", message: "Sin acceso." } }, { status: 403 });
  const att = await getAttachment({ companyId, userId: user.id }, id);
  if (!att) return NextResponse.json({ error: { code: "NOT_FOUND", message: "No existe." } }, { status: 404 });

  await record(db as never, { companyId, actorUserId: user.id, action: "download", entityType: "attachment", entityId: id }, `tx-dl-${id}`);
  if (att.storageKey.startsWith("fs:")) {
    const bytes = readFsBlob(att.sha256);
    if (!bytes) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Blob ausente." } }, { status: 404 });
    return new Response(bytes as unknown as BodyInit, {
      headers: {
        "Content-Type": att.mime,
        "Content-Disposition": `attachment; filename="${att.originalName}"`,
        "X-Content-Type-Options": "nosniff",
      },
    });
  }
  const url = await getBlobUrl(att.storageKey);
  return NextResponse.redirect(url);
}
