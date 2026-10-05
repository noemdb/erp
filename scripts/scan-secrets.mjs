/** SEC-02/ADR-029: escáner de secretos (pre-commit/CI). Falla si hay patrones de secreto
 * en archivos versionables, nombres de archivo riesgosos, o material secreto ya trackeado
 * en git. Uso: npm run secrets:scan */
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const SKIP_DIRS = new Set(["node_modules", ".next", ".git", "acceptance", "migration-report", "storage"]);
const SKIP_FILES = new Set(["package-lock.json", ".env.example"]);
const PLACEHOLDERS = new Set(["changeme", "xxx", "example", "test", "password", "secret", "changeme-min-32-chars"]);
const PATTERNS = [
  /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /AKIA[0-9A-Z]{16}/,
  /sk_live_[A-Za-z0-9]+/,
  /postgresql:\/\/[^/\s:]+:[^/\s@]+@/i,
  /(["']?password["']?\s*[:=]\s*["'][^"']{4,}["'])/i,
];

const hits = [];
function walk(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith(".env")) continue; // .env fuera del repo por .gitignore; se audita aparte
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      if (!SKIP_DIRS.has(e.name)) walk(p);
    } else {
      // SEC-02: nombre de archivo riesgoso (clave/identidad), con o sin extensión.
      // `serverc` (sin extensión) pasó el escáner anterior por este hueco (ADR-029).
      if (/^(serverc.*|id_[a-z0-9_.-]*|.*\.(pem|key|p12|pfx))$/i.test(e.name))
        hits.push(`${p.replace(root + "/", "")}: nombre de archivo de secreto`);
      if (!SKIP_FILES.has(e.name) && /\.(ts|tsx|js|mjs|json|md|yml|yaml|sql|txt|csv)$/.test(e.name)) {
      let content;
      try {
        content = readFileSync(p, "utf8");
      } catch {
        continue;
      }
PATTERNS.forEach((re, i) => {
      for (const [n, line] of content.split("\n").entries()) {
        if (line.includes("secrets:allow")) continue; // excepción marcada y revisada
        if (re.test(line)) hits.push(`${p.replace(root + "/", "")}:${n + 1} patrón ${i + 1}`);
      }
    });
      }
    }
  }
}
walk(root);
// .gitignore debe cubrir los patrones exigidos por SEC-02/ADR-029.
for (const need of ["^\\.env$", "serverc", "\\*\\.pem", "\\*\\.key", "id_"]) {
  if (!existsSync(join(root, ".gitignore")) || !new RegExp(need, "m").test(readFileSync(join(root, ".gitignore"), "utf8"))) {
    hits.push(`.gitignore: falta patrón ${need}`);
  }
}
// Nada secreto puede estar trackeado en git (el hueco que dejó entrar `serverc`, ADR-029).
try {
  const tracked = execSync("git ls-files", { cwd: root, encoding: "utf8" }).split("\n").map((s) => s.trim()).filter(Boolean);
  for (const f of tracked) {
    const b = basename(f);
    if (/^(serverc.*|id_[a-z0-9_.-]*|.*\.(pem|key|p12|pfx))$/i.test(b) || (/^\.env($|\.)/.test(b) && b !== ".env.example"))
      hits.push(`trackeado en git: ${f}`);
  }
} catch { /* fuera de un repo git: se omite este control */ }
if (hits.length > 0) {
  console.error(`secretos potenciales:\n- ${hits.join("\n- ")}`);
  process.exit(1);
}
// .env.example: solo placeholders conocidos.
try {
  const ex = readFileSync(join(root, ".env.example"), "utf8");
  const urls = [...ex.matchAll(/postgresql:\/\/[^/\s:]+:([^/\s@]+)@/gi)].map((m) => m[1]);
  const bad = urls.filter((p) => !PLACEHOLDERS.has(p));
  if (bad.length > 0) {
    console.error(".env.example con credenciales no placeholder");
    process.exit(1);
  }
} catch { /* sin example: el CI lo exige aparte */ }
console.log("scan limpio");
