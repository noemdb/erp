/** 5.2: rol runtime de mínimo privilegio (idempotente). Uso: node scripts/create-app-role.mjs (requiere DATABASE_URL de owner). Guarda APP_DATABASE_URL en .env (gitignored). */
import { randomBytes } from "node:crypto";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const loadEnv = () => {
  try {
    for (const line of readFileSync(join(root, ".env"), "utf8").split("\n")) {
      const m = /^([A-Z_]+)=(.*)$/.exec(line.trim());
      if (m) process.env[m[1]] ??= m[2].replace(/^["']|["']$/g, "");
    }
  } catch { /* sin .env */ }
};
loadEnv();

const s = postgres(process.env.DATABASE_URL, { prepare: false });
const q = (name, fn) => fn().then(() => console.log("ok:", name)).catch((e) => { console.log("FAIL:", name, e.message); process.exitCode = 1; });

let env = {};
try {
  env = Object.fromEntries(readFileSync(join(root, ".env"), "utf8").split("\n").map((l) => { const m = /^([A-Z_]+)=(.*)$/.exec(l.trim()); return m ? [m[1], m[2]] : null; }).filter(Boolean));
} catch { /* noop */ }
let password = (env.APP_ROLE_PASSWORD ?? "").replace(/^["']|["']$/g, "");
if (!password) {
  password = randomBytes(24).toString("base64url");
  const line = `\nAPP_ROLE_PASSWORD="${password}"\n`; // secrets:allow (variable generada, no literal)
  writeFileSync(join(root, ".env"), (existsSync(join(root, ".env")) ? readFileSync(join(root, ".env"), "utf8") : "") + line);
  console.log("ok: password generado en .env (APP_ROLE_PASSWORD)");
}

await q("role", async () => {
  const exists = await s.unsafe("SELECT 1 FROM pg_roles WHERE rolname = 'app_runtime'");
  if (exists.length === 0) await s.unsafe("CREATE ROLE app_runtime NOLOGIN");
  await s.unsafe(`ALTER ROLE app_runtime WITH LOGIN PASSWORD '${password.replace(/'/g, "''")}'`);
});
await q("connect+usage", async () => {
  await s.unsafe("GRANT CONNECT ON DATABASE neondb TO app_runtime");
  await s.unsafe("GRANT USAGE ON SCHEMA public TO app_runtime");
});
await q("dml", async () => {
  await s.unsafe("GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_runtime");
  await s.unsafe("ALTER DEFAULT PRIVILEGES FOR ROLE neondb_owner IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_runtime");
  await s.unsafe("GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_runtime");
  await s.unsafe("ALTER DEFAULT PRIVILEGES FOR ROLE neondb_owner IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO app_runtime");
});
await q("quitar-create-schema", async () => {
  await s.unsafe("REVOKE CREATE ON SCHEMA public FROM app_runtime");
});
await q("audit-append-only", async () => {
  await s.unsafe("REVOKE UPDATE, DELETE ON audit_events FROM app_runtime");
  await s.unsafe("GRANT INSERT, SELECT ON audit_events TO app_runtime");
});

// Verificación negativa como el propio rol
const base = process.env.DATABASE_URL.replace(/:\/\/[^@]+@/, `://app_runtime:${encodeURIComponent(password)}@`);
const app = postgres(base, { prepare: false, max: 1 });
const mustFail = async (name, fn) => {
  try {
    await fn();
    console.log("FAIL:", name, "PERMITIDA (inesperado)");
    process.exitCode = 1;
  } catch (e) {
    console.log("ok:", name, "rechazada");
  }
};
await mustFail("CREATE ROLE", () => app.unsafe("CREATE ROLE x_nope"));
await mustFail("DROP TABLE", () => app.unsafe("DROP TABLE parties"));
await mustFail("ALTER TABLE", () => app.unsafe("ALTER TABLE parties ADD COLUMN x_nope text"));
await mustFail("CREATE EXTENSION", () => app.unsafe('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"'));
await mustFail("CREATE DATABASE", () => app.unsafe("CREATE DATABASE x_nope"));
await mustFail("DROP DATABASE", () => app.unsafe("DROP DATABASE neondb"));
await mustFail("UPDATE audit", () => app.unsafe("UPDATE audit_events SET reason = 'x' WHERE false"));
await q("lectura app", async () => {
  await app.unsafe("SELECT 1 FROM companies LIMIT 1");
});
await app.end();

// APP_DATABASE_URL para la app y la prueba negativa
{
  const path = join(root, ".env");
  let content = existsSync(path) ? readFileSync(path, "utf8") : "";
  const url = process.env.DATABASE_URL.replace(/:\/\/[^@]+@/, `://app_runtime:${encodeURIComponent(password)}@`);
  if (/^APP_DATABASE_URL=/m.test(content)) content = content.replace(/^APP_DATABASE_URL=.*$/m, `APP_DATABASE_URL="${url}"`);
  else content += `\nAPP_DATABASE_URL="${url}"\n`;
  writeFileSync(path, content);
  console.log("ok: APP_DATABASE_URL en .env");
}
await s.end();
