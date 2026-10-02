import { redirect } from "next/navigation";
import { getSessionUser } from "@/modules/identity/session";
import { getCompanyContext } from "@/modules/tenancy/repo";
import { listObligations, listHolidays, getAlerts } from "@/modules/deadlines/service";
import { ObligationForm, HolidayForm } from "./forms";

function todayCaracas(): string {
  return new Date(Date.now() - 4 * 3600_000).toISOString().slice(0, 10);
}

export default async function PlazosPage({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!(await getCompanyContext(companyId, user.id))) redirect("/dashboard");
  const ctx = { companyId, userId: user.id };
  const [obs, hols, alerts] = await Promise.all([listObligations(ctx), listHolidays(ctx), getAlerts(ctx, todayCaracas())]);
  return (
    <main>
      <h1>Plazos de entrega (1.0.2 — valores los define el contador)</h1>
      <h2>Alertas (no cambian estado fiscal)</h2>
      <table>
        <thead><tr><th>Comprobante</th><th>Emisión</th><th>Límite</th><th>Estado</th></tr></thead>
        <tbody>
          {alerts.map((a) => (
            <tr key={a.id}><td>{a.certificate}</td><td>{a.fechaEmision}</td><td>{a.due ?? "sin regla"}</td><td>{a.state}</td></tr>
          ))}
        </tbody>
      </table>
      <h2>Obligaciones</h2>
      <ul>
        {obs.map((o) => (
          <li key={o.id}>{o.kind} · {o.fuenteNormativa} art. {o.articulo} · {o.diasHabiles} días hábiles desde período siguiente · {o.effectiveRange}</li>
        ))}
      </ul>
      <ObligationForm companyId={companyId} />
      <h2>Feriados</h2>
      <ul>
        {hols.map((h) => (
          <li key={h.id}>{h.fecha} {h.descripcion ?? ""}</li>
        ))}
      </ul>
      <HolidayForm companyId={companyId} />
    </main>
  );
}
