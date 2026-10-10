import { describe, it, expect } from "vitest";
import {
  PRACTICA_EMAILS,
  CLEAN_CONFIRM,
  RESTORE_CONFIRM,
  MAX_RESTORE_BYTES,
  CleanInputSchema,
  RestoreInputSchema,
  backupFilenameFor,
  looksLikeSqlDump,
  resolvePgBin,
  sha256Hex,
  verifyDumpSql,
  appendHistory,
  readHistory,
} from "./service";

describe("maintenance (puros)", () => {
  it("nombre de backup con formato fijo UTC", () => {
    expect(backupFilenameFor(new Date("2026-10-09T14:30:22Z"))).toBe("erp-backup-20261009-143022.sql");
  });

  it("palabras de confirmación exactas", () => {
    expect(CLEAN_CONFIRM).toBe("ELIMINAR");
    expect(RESTORE_CONFIRM).toBe("RESTAURAR");
  });

  it("cuentas de práctica preservadas (4, espejo de seed-practica.ts)", () => {
    expect([...PRACTICA_EMAILS]).toEqual([
      "alejandro@practica.local",
      "maria@practica.local",
      "carlos@practica.local",
      "vargas@practica.local",
    ]);
  });

  it("limpieza exige ELIMINAR + motivo", () => {
    expect(CleanInputSchema.safeParse({ confirm: "ELIMINAR", reason: "entorno de pruebas" }).success).toBe(true);
    expect(CleanInputSchema.safeParse({ confirm: "eliminar", reason: "x".repeat(10) }).success).toBe(false);
    expect(CleanInputSchema.safeParse({ confirm: "ELIMINAR", reason: "no" }).success).toBe(false);
  });

  it("restore exige RESTAURAR + copia previa + .sql", () => {
    expect(RestoreInputSchema.safeParse({ confirm: "RESTAURAR", backupDone: "true", filename: "erp-backup.sql" }).success).toBe(true);
    expect(RestoreInputSchema.safeParse({ confirm: "RESTAURAR", backupDone: "false", filename: "b.sql" }).success).toBe(false);
    expect(RestoreInputSchema.safeParse({ confirm: "RESTAURAR", backupDone: "true", filename: "b.dump" }).success).toBe(false);
  });

  it("tope de restore 100 MB", () => {
    expect(MAX_RESTORE_BYTES).toBe(100 * 1024 * 1024);
  });

  it("detecta dump SQL válido", () => {
    const dump = "--\n-- PostgreSQL database dump\n--\nSET statement_timeout = 0;\nCREATE TABLE public.users (id uuid);";
    expect(looksLikeSqlDump(dump)).toBe(true);
  });

  it("rechaza vacío, corto y binario", () => {
    expect(looksLikeSqlDump("")).toBe(false);
    expect(looksLikeSqlDump("hola mundo")).toBe(false);
    expect(looksLikeSqlDump(`CREATE TABLE t (a text); INSERT INTO t VALUES ('x');\u0000binario`)).toBe(false);
  });

  it("resuelve pg_dump/psql al cliente más nuevo disponible (≥ servidor)", () => {
    // En dev hay cliente 18 local; en otros entornos, al menos el de PATH.
    for (const name of ["pg_dump", "psql"] as const) {
      const { bin } = resolvePgBin(name);
      expect(bin).toContain(name);
    }
    expect(resolvePgBin("pg_dump").bin).toContain("18");
  });

  it("sha256 estable y con formato hex", () => {
    expect(sha256Hex(Buffer.from("abc"))).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });

  it("verifica dump: tablas, copies e marca final", () => {
    const dump = [
      "-- PostgreSQL database dump",
      "CREATE TABLE public.users (id uuid);",
      "CREATE TABLE public.companies (id uuid);",
      "COPY public.users (id) FROM stdin;",
      "INSERT INTO public.x VALUES (1);",
      "-- PostgreSQL database dump complete",
    ].join("\n");
    expect(verifyDumpSql(dump)).toEqual({ tablas: 2, copies: 1, inserts: 1, completa: true });
    expect(verifyDumpSql("CREATE TABLE a (x int);").completa).toBe(false);
  });

  it("historial append + lectura (ruta temporal)", () => {
    const prev = process.env.MAINT_HISTORY_PATH;
    process.env.MAINT_HISTORY_PATH = `/tmp/opencode/maint-hist-${Date.now()}.jsonl`;
    try {
      expect(readHistory()).toEqual([]);
      appendHistory({ ts: "2026-10-10T00:00:00Z", actor: "u1", action: "backup", bytes: 10, sha256: "ab" });
      appendHistory({ ts: "2026-10-10T01:00:00Z", actor: "u1", action: "clean", counts: { companies: 1, users: 2, preservedUsers: 3 } });
      const got = readHistory();
      expect(got).toHaveLength(2);
      expect(got[0]!.action).toBe("clean");
      expect(got[1]!.sha256).toBe("ab");
    } finally {
      if (prev === undefined) delete process.env.MAINT_HISTORY_PATH;
      else process.env.MAINT_HISTORY_PATH = prev;
    }
  });

  it("limpieza global y por empresa comparten esquema de confirmación", () => {
    expect(CleanInputSchema.safeParse({ confirm: "ELIMINAR", reason: "motivo real" }).success).toBe(true);
    const withCompany = CleanInputSchema.safeParse({
      confirm: "ELIMINAR",
      reason: "motivo real",
      companyId: "123e4567-e89b-12d3-a456-426614174000",
    });
    expect(withCompany.success).toBe(true);
    expect(CleanInputSchema.safeParse({ confirm: "ELIMINAR", reason: "motivo", companyId: "no-uuid" }).success).toBe(false);
  });
});
