import { eq, and } from "drizzle-orm";
import type { DrizzleTx } from "@/modules/tenancy/with-tenant";
import { withholdingRules } from "@/db/schema";
import { GLOBAL_SCOPE } from "./constants";

function contains(range: string, date: string): boolean {
  const m = /^\[(.*?),(.*?)\)$/.exec(range);
  if (!m) return false;
  const [, from, to] = m;
  return (from === "" || from === "-infinity" || date >= from!) && (to === "" || to === "infinity" || date < to!);
}

/** Regla IVA vigente a fecha: primero empresa, si no global (seed 75%). */
export async function resolveIvaRule(tx: DrizzleTx, companyId: string, asOf: string) {
  const rows = await tx
    .select()
    .from(withholdingRules)
    .where(and(eq(withholdingRules.ruleKind, "iva"), eq(withholdingRules.status, "active")));
  const live = rows.filter((r) => contains(r.effectiveRange, asOf));
  return live.find((r) => r.companyScopeKey === companyId) ?? live.find((r) => r.companyScopeKey === GLOBAL_SCOPE) ?? null;
}
