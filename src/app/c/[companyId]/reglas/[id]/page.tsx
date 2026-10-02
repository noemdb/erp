import { redirect } from "next/navigation";
import { getSessionUser } from "@/modules/identity/session";
import { getRule } from "@/modules/rules/service";
import { listAuditEvents } from "@/modules/audit/queries";
import { RuleFlowButtons } from "./flow-buttons";

export default async function ReglaDetallePage({ params }: { params: Promise<{ companyId: string; id: string }> }) {
  const { companyId, id } = await params;
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const ctx = { companyId, userId: user.id };
  const data = await getRule(ctx, id);
  if (!data) redirect(`/c/${companyId}/reglas`);
  const trail = await listAuditEvents(ctx, { entityType: "withholding_rule", entityId: id });
  const r = data.rule;
  return (
    <main>
      <h1>Regla {r.ruleKind} ({r.status})</h1>
      <p>%: {r.porcentaje} · Sustraendo: {r.sustraendo} · Vigencia: {r.effectiveRange}</p>
      <p>Fuente: {r.legalReference} · Motivo: {r.changeReason}</p>
      <RuleFlowButtons companyId={companyId} id={id} status={r.status} />
      <h2>Historial (quién/qué/cuándo/motivo)</h2>
      <ul>
        {trail.map((t) => (
          <li key={t.id}>{t.occurredAt?.toISOString()} — {t.action}{t.reason ? `: ${t.reason}` : ""}</li>
        ))}
      </ul>
    </main>
  );
}
