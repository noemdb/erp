import { NextResponse } from "next/server";
import { getSessionUser } from "@/modules/identity/session";
import { checkRateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { migrationUrl } from "@/lib/env";
import { isGlobalAdmin } from "@/modules/maintenance/repo";
import { runPgDump, buildBackupFilename, sha256Hex, verifyDumpSql, appendHistory } from "@/modules/maintenance/service";

/** Descarga del backup SQL completo (`pg_dump` plano). Solo admin, 5/hora. */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Inicia sesión." } }, { status: 401 });
  if (!(await isGlobalAdmin(user.id)))
    return NextResponse.json({ error: { code: "FORBIDDEN", message: "Solo administradores." } }, { status: 403 });
  if (!checkRateLimit(`admin-backup:${user.id}`, 5, 60 * 60 * 1000))
    return NextResponse.json({ error: { code: "RATE_LIMITED", message: "Límite de backups alcanzado." } }, { status: 429 });

  let url: string;
  try {
    url = migrationUrl();
  } catch {
    return NextResponse.json({ error: { code: "CONFIG_ERROR", message: "Falta DATABASE_URL para el backup." } }, { status: 500 });
  }
  const res = runPgDump(url);
  if (!res.ok) {
    logger.error({ actor: user.id, code: res.error.code, action: "admin.database.backup" }, "backup fallido");
    return NextResponse.json({ error: res.error }, { status: 500 });
  }
  const sha = sha256Hex(res.bytes);
  const head = res.bytes.slice(0, 2 * 1024 * 1024).toString("utf8");
  const tail = res.bytes.slice(-4096).toString("utf8");
  const check = verifyDumpSql(`${head}\n${tail}`);
  logger.info({ actor: user.id, bytes: res.bytes.length, sha256: sha, action: "admin.database.backup" }, "backup descargado");
  appendHistory({ ts: new Date().toISOString(), actor: user.id, action: "backup", bytes: res.bytes.length, sha256: sha, tablas: check.tablas });
  const filename = buildBackupFilename();
  return new Response(new Uint8Array(res.bytes), {
    headers: {
      "Content-Type": "application/sql; charset=utf-8",
      "Content-Disposition": `attachment; filename=${filename}`,
      "X-Backup-Sha256": sha,
      "X-Backup-Bytes": String(res.bytes.length),
      "X-Backup-Tables": String(check.tablas),
      "X-Backup-Complete": check.completa ? "1" : "0",
    },
  });
}
