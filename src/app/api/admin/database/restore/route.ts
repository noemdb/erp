import { NextResponse } from "next/server";
import { getSessionUser } from "@/modules/identity/session";
import { checkRateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { migrationUrl } from "@/lib/env";
import { isGlobalAdmin } from "@/modules/maintenance/repo";
import {
  RestoreInputSchema,
  MAX_RESTORE_BYTES,
  looksLikeSqlDump,
  runPgDump,
  runPsqlRestore,
  writeTempSql,
  removeTempSql,
  saveSafetyCopy,
  appendHistory,
} from "@/modules/maintenance/service";

/** Restaura un .sql previamente descargado (multipart: file, confirm, backupDone).
 *  Red de seguridad: copia previa automática en el servidor (fail-closed si falla).
 *  Todo o nada (`ON_ERROR_STOP=1` en una sola llamada `psql`). Solo admin, 3/hora.
 */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Inicia sesión." } }, { status: 401 });
  if (!(await isGlobalAdmin(user.id)))
    return NextResponse.json({ error: { code: "FORBIDDEN", message: "Solo administradores." } }, { status: 403 });
  if (!checkRateLimit(`admin-restore:${user.id}`, 3, 60 * 60 * 1000))
    return NextResponse.json({ error: { code: "RATE_LIMITED", message: "Límite de restores alcanzado." } }, { status: 429 });

  const form = await req.formData();
  const file = form.get("file");
  const parsed = RestoreInputSchema.safeParse({
    confirm: String(form.get("confirm") ?? ""),
    backupDone: String(form.get("backupDone") ?? ""),
    filename: file instanceof File ? file.name : "",
  });
  if (!parsed.success)
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Confirmación inválida." } },
      { status: 400 },
    );
  if (!(file instanceof File))
    return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Falta archivo .sql." } }, { status: 400 });

  const bytes = Buffer.from(await file.arrayBuffer());
  if (bytes.length === 0 || bytes.length > MAX_RESTORE_BYTES)
    return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Archivo vacío o mayor de 100 MB." } }, { status: 400 });
  if (bytes.includes(0) || !looksLikeSqlDump(bytes.slice(0, 8000).toString("utf8")))
    return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "El archivo no parece un backup SQL válido." } }, { status: 400 });

  let url: string;
  try {
    url = migrationUrl();
  } catch {
    return NextResponse.json({ error: { code: "CONFIG_ERROR", message: "Falta DATABASE_URL para el restore." } }, { status: 500 });
  }
  // Red de seguridad: copia previa en el servidor antes de tocar nada.
  const current = runPgDump(url);
  if (!current.ok)
    return NextResponse.json({ error: { code: "SAFETY_FAILED", message: "No se pudo guardar la copia previa: restore bloqueado por seguridad." } }, { status: 500 });
  const safety = saveSafetyCopy(current.bytes);
  if (!safety)
    return NextResponse.json({ error: { code: "SAFETY_FAILED", message: "No se pudo guardar la copia previa en el servidor." } }, { status: 500 });

  const tmp = writeTempSql(bytes);
  try {
    const res = runPsqlRestore(url, tmp);
    if (!res.ok) {
      logger.error({ actor: user.id, code: res.error.code, size: bytes.length, safety, action: "admin.database.restore" }, "restore fallido");
      return NextResponse.json({ error: res.error }, { status: 500 });
    }
  } finally {
    removeTempSql(tmp);
  }
  logger.info({ actor: user.id, size: bytes.length, safety, action: "admin.database.restore" }, "restore aplicado");
  appendHistory({ ts: new Date().toISOString(), actor: user.id, action: "restore", bytes: bytes.length, safety });
  return NextResponse.json({ data: { ok: true, bytes: bytes.length, safety } });
}
