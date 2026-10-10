import { NextResponse } from "next/server";
import { getSessionUser } from "@/modules/identity/session";
import { isGlobalAdmin, postRestoreCheck } from "@/modules/maintenance/repo";

/** Checklist post-restore: empresas con conteos, series y último cierre. Solo admin. Solo lectura. */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Inicia sesión." } }, { status: 401 });
  if (!(await isGlobalAdmin(user.id)))
    return NextResponse.json({ error: { code: "FORBIDDEN", message: "Solo administradores." } }, { status: 403 });
  return NextResponse.json({ data: await postRestoreCheck() });
}
