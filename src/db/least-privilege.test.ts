import { describe, expect, it } from "vitest";
import postgres from "postgres";

/**
 * TST-01: prueba negativa contra el rol app_runtime.
 * - Sin APP_DATABASE_URL exportada se omite (veredicto `skipped`, no verde):
 *   crear el rol con `scripts/create-app-role.mjs` (usa DATABASE_MIGRATION_URL)
 *   y exportar APP_DATABASE_URL para ejecutarla. Dev sigue con owner hasta
 *   migrar los seeds de pruebas a contexto explícito (OPS-02).
 * - Con URL pero sin conexión, falla con mensaje accionable (antes: error
 *   críptico de password que se toleraba como "rojo conocido").
 */
const url = process.env.APP_DATABASE_URL;

async function connectOrThrow() {
  try {
    const app = postgres(url!, { prepare: false, max: 1, connect_timeout: 10 });
    await app.unsafe("SELECT 1");
    return app;
  } catch (e) {
    throw new Error(
      "TST-01: APP_DATABASE_URL no conecta. Crea/actualiza el rol app_runtime con " +
        "scripts/create-app-role.mjs (con DATABASE_MIGRATION_URL como owner) y exporta la " +
        "URL vigente. Causa original: " +
        (e instanceof Error ? e.message : String(e)),
    );
  }
}

describe.skipIf(!url)("rol de mínimo privilegio", () => {
  it("niega administración y hace cumplir RLS", async () => {
    const app = await connectOrThrow();
    try {
      await expect(app.unsafe("CREATE ROLE x_nope")).rejects.toThrow();
      await expect(app.unsafe("DROP TABLE parties")).rejects.toThrow();
      await expect(app.unsafe("CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\"")).rejects.toThrow();
      await expect(app.unsafe("UPDATE audit_events SET reason = 'x' WHERE false")).rejects.toThrow();
      // RLS: insert sin contexto se rechaza (42501), no se filtra en silencio
      await expect(
        app.unsafe("INSERT INTO branches (company_id, codigo, nombre) VALUES ('00000000-0000-0000-0000-000000000000', 'X', 'X')"),
      ).rejects.toThrow(/42501|policy/);
      // Lectura permitida dentro del ámbito
      await app.unsafe("SELECT 1 FROM companies LIMIT 1");
    } finally {
      await app.end();
    }
  });
});
