/** 2.0.5 §2: escáner de secretos (pre-commit/CI). Falla si hay patrones de secreto en archivos versionables. Uso: npm run secrets:scan */
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

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
    } else if (!SKIP_FILES.has(e.name) && /\.(ts|tsx|js|mjs|json|md|yml|yaml|sql|txt|csv)$/.test(e.name)) {
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
walk(root);
if (!existsSync(join(root, ".gitignore")) || !/^\.env$/m.test(readFileSync(join(root, ".gitignore"), "utf8"))) {
  hits.push(".gitignore: no ignora .env");
}
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
