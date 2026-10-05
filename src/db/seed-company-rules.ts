/**
 * Seeder de reglas tributarias por empresa (Venezuela).
 *
 * Inserta en `/c/[companyId]/reglas` las reglas transcritas de la matriz
 * `docs/anexos/matriz-reglas-v1.md` usando el workflow fiscal controlado
 * (ADR-022): borrador → revisión → aprobación → activación, todo auditado.
 * Idempotente: re-ejecutar no duplica.
 *
 * Uso:
 *   COMPANY_ID=<uuid> SEED_USER_EMAIL=<contador|admin> npm run seed:company-rules
 *   # o: npx tsx src/db/seed-company-rules.ts <companyId> <userEmail>
 *   # Con matriz firmada (única vía a valores no sintéticos):
 *   #   npx tsx src/db/seed-company-rules.ts <companyId> <userEmail> --matrix-hash=<sha256 de docs/anexos/matriz-reglas-v1.md>
 *
 * Guardia GIT-02: sin --matrix-hash válido todo queda synthetic + borrador
 * (el contador activa en UI); en producción sin hash se rechaza.
 *
 * Qué siembra (y por qué):
 * - IVA 75 % ordinario (Providencia SNAT/2025/000054, art. 4, vigente
 *   desde 01-08-2025): se activa, el motor la consume vía `resolveIvaRule`.
 * - IVA 100 % (misma Providencia, art. 5): queda en BORRADOR, no se activa.
 *   Activarla sobrescribiría al 75 % (EXCLUDE por vigencia) y el art. 5 es
 *   condicional (4 supuestos); requiere modelado de `conditions` + decisión
 *   del contador antes de activarse.
 * - ISLR: NO siembra porcentajes (bloqueado ADR-019/TODO F0: tasas de tablas
 *   secundarias sin cotejo en Gaceta ni firma del contador). Solo asegura que
 *   existan los conceptos del catálogo para que el contador cree borradores.
 */
import { eq } from "drizzle-orm";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { db } from "./client";
import { users, companies } from "./schema";
import { authorize } from "@/modules/tenancy/authorize";
import {
  createDraft,
  submitRule,
  approveRule,
  activateRule,
  createConcept,
  listRules,
} from "@/modules/rules/service";

const VIGENCIA_IVA_2025 = "2025-08-01"; // Providencia SNAT/2025/000054, art. 20

const IVA_75 = {
  ruleKind: "iva" as const,
  conceptId: null,
  effectiveFrom: VIGENCIA_IVA_2025,
  porcentaje: "0.75",
  sustraendo: "0",
  baseFormulaKind: "iva_causado",
  legalReference:
    "Providencia Administrativa SNAT/2025/000054, art. 4 — G.O. N.º 43.171 (16-07-2025), vigente desde 01-08-2025 (art. 20)",
  changeReason:
    "Seed matriz-reglas-v1 (IVA-01): retención ordinaria del 75 % del IVA causado",
  synthetic: false,
};

const IVA_100_BORRADOR = {
  ruleKind: "iva" as const,
  conceptId: null,
  effectiveFrom: VIGENCIA_IVA_2025,
  porcentaje: "1",
  sustraendo: "0",
  baseFormulaKind: "iva_causado",
  legalReference:
    "Providencia Administrativa SNAT/2025/000054, art. 5 — G.O. N.º 43.171 (16-07-2025), vigente desde 01-08-2025 (art. 20)",
  changeReason:
    "Seed matriz-reglas-v1 (IVA-02, BORRADOR sin activar): 100 % cuando el impuesto no esté discriminado, la factura incumpla requisitos, el Portal Fiscal indique 100 %, el proveedor no tenga RIF u operaciones del art. 2. NO activar: comparte vigencia con IVA-01 y es condicional; requiere modelado de conditions + firma del contador",
  synthetic: false,
};

/** Mismo catálogo que `seed-rules.ts` (global) para coherencia empresa↔global. */
const CONCEPTS = [
  ["HON", "Honorarios profesionales"],
  ["COM", "Comisiones"],
  ["ALQ", "Alquileres"],
  ["PUB", "Publicidad"],
  ["TRA", "Transporte"],
  ["SER", "Otros servicios"],
] as const;

const pct = (v: string | null | undefined): number | null => {
  if (v == null) return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
};

async function main() {
  const companyId = (process.argv[2] ?? process.env.COMPANY_ID ?? "").trim();
  const email = (process.argv[3] ?? process.env.SEED_USER_EMAIL ?? "").trim().toLowerCase();
  if (!companyId || !email) {
    console.error("uso: COMPANY_ID=<uuid> SEED_USER_EMAIL=<email> npm run seed:company-rules [-- --matrix-hash=<sha256 de docs/anexos/matriz-reglas-v1.md firmada>]");
    process.exit(1);
  }

  // GIT-02 (guardia fiscal): por defecto todo lo sembrado es SINTÉTICO y queda
  // en borrador — nunca valores fiscales "reales". Solo con --matrix-hash igual
  // al sha256 de la matriz firmada se autoriza el flujo completo (el contador
  // activa por el workflow). En producción sin hash válido se rechaza.
  const hashArg = process.argv.find((a) => a.startsWith("--matrix-hash="))?.split("=")[1]?.trim().toLowerCase()
    ?? (process.env.MATRIX_HASH ?? "").trim().toLowerCase();
  const matrizPath = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "docs", "anexos", "matriz-reglas-v1.md");
  let matrizHash = "";
  try {
    matrizHash = createHash("sha256").update(readFileSync(matrizPath, "utf8")).digest("hex");
  } catch {
    console.error(`no se pudo leer la matriz de referencia: ${matrizPath}`);
    process.exit(1);
  }
  const authorized = !!hashArg && hashArg === matrizHash;
  if (hashArg && !authorized) {
    console.error("MATRIX_HASH no coincide con el sha256 de docs/anexos/matriz-reglas-v1.md; rechaza carga de valores reales.");
    process.exit(1);
  }
  if (process.env.NODE_ENV === "production" && !authorized) {
    console.error("producción: seed:company-rules exige --matrix-hash=<sha256 de la matriz firmada>; sin matriz firmada no se siembra.");
    process.exit(1);
  }
  const synthetic = !authorized;
  console.log(authorized
    ? `matriz autorizada (sha256 ${matrizHash.slice(0, 12)}…): flujo completo por workflow.`
    : "modo SINTÉTICO (sin --matrix-hash válido): borradores marcados synthetic, sin enviar/revisar/activar; el contador los revisa y activa en UI.");

  const [company] = await db.select().from(companies).where(eq(companies.id, companyId)).limit(1);
  if (!company) {
    console.error(`empresa no existe: ${companyId}`);
    process.exit(1);
  }
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user) {
    console.error(`usuario no existe: ${email}`);
    process.exit(1);
  }
  const auth = await authorize(companyId, user.id, "rules.edit");
  if (!auth.ok) {
    console.error(`el usuario ${email} no tiene permiso rules.edit en esta empresa (requiere contador o admin).`);
    process.exit(1);
  }
  const ctx = { companyId, userId: user.id };
  console.log(`empresa: ${company.razonSocial} · usuario: ${email} (${auth.role})`);

  // 1. Conceptos ISLR (solo catálogo, sin tasas — ADR-019).
  for (const [codigo, nombre] of CONCEPTS) {
    const res = await createConcept(ctx, { codigo, nombre });
    if (res.ok) console.log(`concepto creado: ${codigo}`);
    else if (res.error.code === "DUPLICATE_DOCUMENT") console.log(`concepto existe: ${codigo}`);
    else {
      console.error(`concepto ${codigo} rechazado: ${res.error.code} ${res.error.message}`);
      process.exit(1);
    }
  }

  // 2. Regla IVA 75 % activa (idempotente).
  const rules = await listRules(ctx);
  const iva75 = rules.find((r) => r.ruleKind === "iva" && r.conceptId === null && pct(r.porcentaje) === 0.75);
  if (iva75?.status === "active") {
    console.log(`IVA 75 % ya activa (${iva75.id}), se omite.`);
  } else if (iva75) {
    console.log(`IVA 75 % existe en estado ${iva75.status} (${iva75.id}): se deja para flujo manual en UI.`);
  } else {
    const otherActive = rules.find((r) => r.ruleKind === "iva" && r.conceptId === null && r.status === "active");
    if (otherActive) {
      console.log(
        `hay otra regla IVA activa (${otherActive.porcentaje}, ${otherActive.id}): no se toca la historia; revisar en UI.`,
      );
    } else {
      const step = async (label: string, fn: () => Promise<{ ok: boolean; error?: unknown }>) => {
        const r = await fn();
        if (!r.ok) {
          const e = r.error as { code?: string; message?: string };
          console.error(`${label} falló: ${e?.code} ${e?.message}`);
          process.exit(1);
        }
      };
      const draft = await createDraft(ctx, { ...IVA_75, synthetic });
      if (!draft.ok) {
        console.error(`borrador IVA 75 % rechazado: ${draft.error.code} ${draft.error.message}`);
        process.exit(1);
      }
      console.log(`borrador IVA 75 % creado (${draft.id})${synthetic ? " [synthetic]" : ""}`);
      if (synthetic) {
        console.log("sintético: se deja en borrador; el contador lo revisa y activa en UI tras la matriz firmada.");
      } else {
        await step("enviar a revisión", () => submitRule(ctx, draft.id));
        await step("aprobar", () => approveRule(ctx, draft.id));
        // ACC-03: aun autorizada, la activación exige dorados firmados que la
        // respalden; sin ellos queda aprobada pendiente (el contador activa en UI
        // tras F0-08). No es fallo del seed.
        const act = await activateRule(ctx, draft.id);
        if (!act.ok && act.error.code.startsWith("GATE_")) {
          console.log(`IVA 75 % APROBADA pendiente de activación (${draft.id}): ${act.error.code} — ${act.error.message}`);
        } else if (!act.ok) {
          console.error(`activar falló: ${act.error.code} ${act.error.message}`);
          process.exit(1);
        } else {
          console.log(`IVA 75 % ACTIVA (${draft.id}) vigente desde ${VIGENCIA_IVA_2025}`);
        }
      }
    }
  }

  // 3. Regla IVA 100 % como borrador (nunca auto-activar — ver encabezado).
  const iva100 = rules.find((r) => r.ruleKind === "iva" && r.conceptId === null && pct(r.porcentaje) === 1);
  if (iva100) {
    console.log(`IVA 100 % ya registrada en estado ${iva100.status} (${iva100.id}), se omite.`);
  } else {
    const draft = await createDraft(ctx, { ...IVA_100_BORRADOR, synthetic });
    if (!draft.ok) {
      console.error(`borrador IVA 100 % rechazado: ${draft.error.code} ${draft.error.message}`);
      process.exit(1);
    }
    console.log(`borrador IVA 100 % creado (${draft.id})${synthetic ? " [synthetic]" : ""}: pendiente de modelado art. 5, NO activar aún.`);
  }

  // 4. Recordatorio ISLR bloqueado.
  const islrActive = (await listRules(ctx)).filter((r) => r.ruleKind === "islr" && r.status === "active");
  console.log(`ISLR: ${islrActive.length} reglas activas (bloqueado ADR-019: sin tasas hasta cotejo + firma del contador).`);
  console.log("listo. Verifica en /c/" + companyId + "/reglas");
  process.exit(0);
}

if (process.argv[1]?.endsWith("seed-company-rules.ts")) {
  main().catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
