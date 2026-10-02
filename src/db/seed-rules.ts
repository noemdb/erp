/** Seeds globales: conceptos ISLR + regla IVA 75% (seed, no constante — ADR-004). Uso: npm run seed:rules */
import { eq, and, isNull } from "drizzle-orm";
import { db } from "./client";
import { withholdingConcepts, withholdingRules } from "./schema";
import { GLOBAL_SCOPE } from "@/modules/withholdings/constants";

const CONCEPTS = [
  ["HON", "Honorarios profesionales", "monto_pagado"],
  ["COM", "Comisiones", "monto_pagado"],
  ["ALQ", "Alquileres", "monto_pagado"],
  ["PUB", "Publicidad", "monto_pagado"],
  ["TRA", "Transporte", "monto_pagado"],
  ["SER", "Otros servicios", "monto_pagado"],
] as const;

async function main() {  for (const [codigo, nombre, base] of CONCEPTS) {
    const found = await db.select().from(withholdingConcepts).where(and(eq(withholdingConcepts.codigo, codigo), isNull(withholdingConcepts.companyId))).limit(1);
    if (!found[0]) {
      await db.insert(withholdingConcepts).values({ companyId: null, codigo, nombre, baseFormulaKind: base });
      console.log("concepto:", codigo);
    }
  }
  const rule = await db.select().from(withholdingRules).where(and(eq(withholdingRules.companyScopeKey, GLOBAL_SCOPE), eq(withholdingRules.ruleKind, "iva"))).limit(1);
  if (!rule[0]) {
    await db.insert(withholdingRules).values({
      companyScopeKey: GLOBAL_SCOPE, ruleKind: "iva", conceptId: null,
      effectiveRange: "[2025-01-01,)", porcentaje: "0.75", sustraendo: "0",
      baseFormulaKind: "iva_causado", legalReference: "Providencias retención IVA 2025 (validar con contador — seed)",
      status: "active", changeReason: "seed inicial",
    });
    console.log("regla IVA 75% global");
  }
  process.exit(0);
}

if (process.argv[1]?.endsWith("seed-rules.ts")) {
  main().catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
