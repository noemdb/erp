import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync, readdirSync, unlinkSync, statSync, appendFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { z } from "zod";

/**
 * Mantenimiento global (ADR-037). Sin DB, sin red, sin reloj salvo el
 * nombre del archivo (inyectado por parámetro para tests deterministas).
 */

/** Cuentas de la sesión de prácticas (`src/db/seed-practica.ts`): nunca se eliminan. */
export const PRACTICA_EMAILS = [
  "alejandro@practica.local",
  "maria@practica.local",
  "carlos@practica.local",
  "vargas@practica.local",
] as const;

/** Palabras de confirmación (es-VE, exactas, sin tilde para evitar errores de teclado). */
export const CLEAN_CONFIRM = "ELIMINAR";
export const RESTORE_CONFIRM = "RESTAURAR";

/** Tope del .sql de restore (multipart en memoria). */
export const MAX_RESTORE_MB = 100;
export const MAX_RESTORE_BYTES = MAX_RESTORE_MB * 1024 * 1024;

export const CleanInputSchema = z.object({
  confirm: z.literal(CLEAN_CONFIRM, { errorMap: () => ({ message: `Escribe ${CLEAN_CONFIRM} para confirmar.` }) }),
  reason: z.string().trim().min(3, "Indica el motivo (mínimo 3 caracteres).").max(500),
  /** uuid de empresa o ausente = todas. Se valida como uuid solo si viene. */
  companyId: z.string().uuid("Empresa inválida.").optional(),
});

export const PreviewInputSchema = z.object({
  companyId: z.string().uuid("Empresa inválida.").optional(),
});

export const RestoreInputSchema = z.object({
  confirm: z.literal(RESTORE_CONFIRM, { errorMap: () => ({ message: `Escribe ${RESTORE_CONFIRM} para confirmar.` }) }),
  backupDone: z.literal("true", { errorMap: () => ({ message: "Confirma que ya descargaste una copia antes de restaurar." }) }),
  filename: z.string().min(1).max(255).regex(/\.sql$/i, "El archivo debe ser .sql."),
});

/** `erp-backup-20261009-143022.sql` (marca temporal `YYYYMMDD-HHMMSS`, UTC). */
export function backupFilenameFor(now: Date): string {
  const p = (n: number, l = 2) => String(n).padStart(l, "0");
  return (
    `erp-backup-${now.getUTCFullYear()}${p(now.getUTCMonth() + 1)}${p(now.getUTCDate())}` +
    `-${p(now.getUTCHours())}${p(now.getUTCMinutes())}${p(now.getUTCSeconds())}.sql`
  );
}

export function buildBackupFilename(): string {
  return backupFilenameFor(new Date());
}

const SQL_MARKERS = [
  "postgresql database dump",
  "create table",
  "copy ",
  "insert into",
  "set statement_timeout",
  "select pg_catalog.set_config",
];

/** Heurística anti-error: el .sql debe parecer texto SQL, no binario ni vacío. */
export function looksLikeSqlDump(head: string): boolean {
  if (!head || head.trim().length < 32) return false;
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(head)) return false;
  const low = head.toLowerCase();
  return SQL_MARKERS.some((m) => low.includes(m));
}

export type DumpResult =
  | { ok: true; bytes: Buffer }
  | { ok: false; error: { code: "BACKUP_NO_PGDUMP" | "BACKUP_VERSION_MISMATCH" | "BACKUP_FAILED"; message: string } };

const VERSION_RE = /\(PostgreSQL\)\s+(\d+)/;

/** Versión major de un binario (`--version`), o 0 si no existe/falla. */
function binMajor(bin: string): number {
  try {
    const p = spawnSync(bin, ["--version"], { encoding: "utf8", timeout: 10_000 });
    if (p.status !== 0) return 0;
    return Number(String(p.stdout).match(VERSION_RE)?.[1] ?? 0);
  } catch {
    return 0;
  }
}

function homePgBin(name: string): string | null {
  const home = process.env.HOME;
  if (!home) return null;
  try {
    const st = statSync(join(home, ".local", "pg18", "bin", name));
    return st.isFile() ? join(home, ".local", "pg18", "bin", name) : null;
  } catch {
    return null;
  }
}

/** Elige el binario PG más nuevo disponible (el dump exige cliente ≥ servidor).
 *  Orden: `PG_DUMP_PATH`/`PSQL_PATH` → `/usr/lib/postgresql/*` (mayor primero)
 *  → `~/.local/pg18/bin` → `PATH`. Con `LD_LIBRARY_PATH` para el cliente local.
 */
export function resolvePgBin(name: "pg_dump" | "psql"): { bin: string; env: Record<string, string> } {
  const override = name === "pg_dump" ? process.env.PG_DUMP_PATH : process.env.PSQL_PATH;
  const found: string[] = [];
  if (override) found.push(override);
  try {
    for (const d of readdirSync("/usr/lib/postgresql")) {
      const c = `/usr/lib/postgresql/${d}/bin/${name}`;
      try {
        if (statSync(c).isFile()) found.push(c);
      } catch {
        /* no es candidato */
      }
    }
  } catch {
    /* sin /usr/lib/postgresql */
  }
  const home = homePgBin(name);
  if (home) found.push(home);
  found.push(name); // PATH como último recurso
  let best = found[found.length - 1] as string;
  let bestMajor = -1;
  for (const c of found) {
    const major = c === name ? binMajor(name) : binMajor(c);
    if (major > bestMajor) {
      bestMajor = major;
      best = c;
    }
  }
  const extraEnv: Record<string, string> = {};
  if (home && best === home && process.env.HOME) {
    extraEnv.LD_LIBRARY_PATH = join(process.env.HOME, ".local", "pg18", "lib");
  }
  return { bin: best, env: extraEnv };
}

/** `pg_dump` plano (`--clean --if-exists`, sin owner/privilegios) apto para `psql -f`. */
export function runPgDump(url: string): DumpResult {
  const { bin, env } = resolvePgBin("pg_dump");
  const proc = spawnSync(bin, ["--dbname", url, "--no-owner", "--no-privileges", "--clean", "--if-exists"], {
    encoding: "buffer",
    timeout: 5 * 60 * 1000,
    maxBuffer: 256 * 1024 * 1024,
    env: { ...process.env, ...env },
  });
  if (proc.error && (proc.error as NodeJS.ErrnoException).code === "ENOENT") {
    return { ok: false, error: { code: "BACKUP_NO_PGDUMP", message: "pg_dump no está instalado en el servidor." } };
  }
  const stderr = String(proc.stderr?.slice(-800) ?? "");
  if (/server version mismatch/i.test(stderr)) {
    return {
      ok: false,
      error: {
        code: "BACKUP_VERSION_MISMATCH",
        message:
          "El cliente pg_dump es más viejo que el servidor PostgreSQL. Instala postgresql-client acorde al servidor o define PG_DUMP_PATH.",
      },
    };
  }
  if (proc.error || proc.status !== 0) {
    const tail = stderr.replace(/password=[^ ]*/gi, "password=[redactado]");
    return { ok: false, error: { code: "BACKUP_FAILED", message: `pg_dump falló${tail ? `: ${tail}` : "."}` } };
  }
  const bytes = proc.stdout as Buffer;
  if (!bytes || bytes.length === 0 || !looksLikeSqlDump(bytes.slice(0, 8000).toString("utf8"))) {
    return { ok: false, error: { code: "BACKUP_FAILED", message: "pg_dump devolvió una salida vacía o inválida." } };
  }
  return { ok: true, bytes };
}

export type RestoreResult =
  | { ok: true }
  | { ok: false; error: { code: "RESTORE_NO_PSQL" | "RESTORE_FAILED"; message: string } };

/** Restaura un .sql validado en UNA transacción (`ON_ERROR_STOP=1`): todo o nada. */
export function runPsqlRestore(url: string, sqlFile: string): RestoreResult {
  const { bin, env } = resolvePgBin("psql");
  const proc = spawnSync(bin, ["--dbname", url, "-X", "-q", "-v", "ON_ERROR_STOP=1", "-f", sqlFile], {
    encoding: "utf8",
    timeout: 10 * 60 * 1000,
    maxBuffer: 16 * 1024 * 1024,
    env: { ...process.env, ...env },
  });
  if (proc.error && (proc.error as NodeJS.ErrnoException).code === "ENOENT") {
    return { ok: false, error: { code: "RESTORE_NO_PSQL", message: "psql no está instalado en el servidor." } };
  }
  if (proc.error || proc.status !== 0) {
    const tail = String(proc.stderr ?? proc.error ?? "").slice(-2000).replace(/password=[^ ]*/gi, "password=[redactado]");
    return { ok: false, error: { code: "RESTORE_FAILED", message: `psql falló (no se aplicó nada)${tail ? `: ${tail}` : "."}` } };
  }
  return { ok: true };
}

/** sha256 hex de bytes (backup, copias de seguridad). Puro. */
export function sha256Hex(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export type DumpVerification = {
  tablas: number;
  copies: number;
  inserts: number;
  completa: boolean;
};

/** Verifica un dump plano sin restaurarlo: CREATE TABLE + COPY/INSERT + marca final. Puro. */
export function verifyDumpSql(text: string): DumpVerification {
  const low = text.toLowerCase();
  return {
    tablas: (low.match(/^create table /gm) ?? []).length,
    copies: (low.match(/^copy /gm) ?? []).length,
    inserts: (low.match(/^insert into /gm) ?? []).length,
    completa: low.includes("postgresql database dump complete"),
  };
}

/** Historial de mantenimiento (JSONL en `/storage`, ignorado por git, sin PII: sin motivos ni correos). */
export type HistoryAction = "backup" | "restore" | "clean";
export type HistoryEntry = {
  ts: string;
  actor: string;
  action: HistoryAction;
  bytes?: number;
  sha256?: string;
  tablas?: number;
  counts?: { companies: number; users: number; preservedUsers: number };
  safety?: string;
};

export function historyPath(): string {
  if (process.env.MAINT_HISTORY_PATH) return process.env.MAINT_HISTORY_PATH;
  return join(process.env.STORAGE_PATH ?? "./storage", ".maintenance-history.jsonl");
}

export function appendHistory(entry: HistoryEntry): void {
  try {
    const file = historyPath();
    mkdirSync(join(file, ".."), { recursive: true });
    appendFileSync(file, `${JSON.stringify(entry)}\n`);
  } catch {
    /* best-effort: la acción ya quedó en el log estructurado */
  }
}

export function readHistory(limit = 10): HistoryEntry[] {
  try {
    const raw = readFileSync(historyPath(), "utf8");
    return raw
      .split("\n")
      .filter((l) => l.trim().length > 0)
      .slice(-limit)
      .map((l) => JSON.parse(l) as HistoryEntry)
      .reverse();
  } catch {
    return [];
  }
}

/** Copias de seguridad previas al restore (`/storage/.safety`, se conservan las últimas 3). */
export const SAFETY_KEEP = 3;

export function safetyDir(): string | null {
  if ((process.env.STORAGE_DRIVER ?? "fs") !== "fs") return null;
  const dir = resolve(process.env.STORAGE_PATH ?? "./storage", ".safety");
  const root = resolve(".");
  if (dir === root || !dir.startsWith(root + "/")) return null;
  return dir;
}

export function saveSafetyCopy(bytes: Buffer, stamp: Date = new Date()): string | null {
  const dir = safetyDir();
  if (!dir) return null;
  try {
    mkdirSync(dir, { recursive: true });
    const p = (n: number, l = 2) => String(n).padStart(l, "0");
    const name =
      `erp-pre-restore-${stamp.getUTCFullYear()}${p(stamp.getUTCMonth() + 1)}${p(stamp.getUTCDate())}` +
      `-${p(stamp.getUTCHours())}${p(stamp.getUTCMinutes())}${p(stamp.getUTCSeconds())}.sql`;
    writeFileSync(join(dir, name), bytes);
    const olds = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
    for (const f of olds.slice(0, Math.max(0, olds.length - SAFETY_KEEP))) {
      try {
        unlinkSync(join(dir, f));
      } catch {
        /* best-effort */
      }
    }
    return name;
  } catch {
    return null;
  }
}
/** Guarda bytes subidos en temporal aprobado (`/tmp/opencode`) para `psql -f`. */
export function writeTempSql(bytes: Buffer): string {
  const dir = mkdtempSync(join(tmpdir(), "erp-restore-"));
  const file = join(dir, "restore.sql");
  writeFileSync(file, bytes);
  return file;
}

export function removeTempSql(file: string): void {
  try {
    rmSync(resolve(file, ".."), { recursive: true, force: true });
  } catch {
    /* best-effort */
  }
}

/** Limpia blobs `fs:` huérfanos tras la limpieza (best-effort, con guardas).
 *  Nunca toca fuera de `STORAGE_PATH` ni si este es la raíz del proyecto.
 */
export function cleanFsStorage(): { deleted: number; skipped: boolean } {
  if ((process.env.STORAGE_DRIVER ?? "fs") !== "fs") return { deleted: 0, skipped: true };
  const dir = resolve(process.env.STORAGE_PATH ?? "./storage");
  const root = resolve(".");
  if (dir === root || !dir.startsWith(root + "/")) return { deleted: 0, skipped: true };
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return { deleted: 0, skipped: true };
  }
  let deleted = 0;
  for (const name of entries) {
    if (name === ".gitkeep" || name.startsWith(".")) continue;
    try {
      if (statSync(join(dir, name)).isFile()) {
        unlinkSync(join(dir, name));
        deleted += 1;
      }
    } catch {
      /* best-effort por archivo */
    }
  }
  return { deleted, skipped: false };
}
