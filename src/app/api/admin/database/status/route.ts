import { NextResponse } from "next/server";
import { getSessionUser } from "@/modules/identity/session";
import { isGlobalAdmin, getDatabaseStatus } from "@/modules/maintenance/repo";
import { readHistory } from "@/modules/maintenance/service";

/** Estado previo: tamaño, conteos e historial de mantenimientos. Solo admin. Solo lectura. */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Inicia sesión." } }, { status: 401 });
  if (!(await isGlobalAdmin(user.id)))
    return NextResponse.json({ error: { code: "FORBIDDEN", message: "Solo administradores." } }, { status: 403 });
  const [status, history] = await Promise.all([getDatabaseStatus(), Promise.resolve(readHistory(10))]);
  return NextResponse.json({ data: { status, history } });
}
