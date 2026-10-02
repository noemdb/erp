import { describe, expect, it } from "vitest";
import postgres from "postgres";

/**
 * 5.2: prueba negativa contra el rol app_runtime (requiere APP_DATABASE_URL,
 * creada por scripts/create-app-role.mjs; se omite si no está definida).
 */
const url = process.env.APP_DATABASE_URL;
describe.skipIf(!url)("rol de mínimo privilegio", () => {
  it("niega administración y hace cumplir RLS", async () => {
    const app = postgres(url!, { prepare: false, max: 1 });
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
