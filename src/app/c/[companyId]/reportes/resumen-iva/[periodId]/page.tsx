import { redirect } from "next/navigation";
import { getSessionUser } from "@/modules/identity/session";
import { getCompanyContext } from "@/modules/tenancy/repo";
import { getIvaSummary, getConciliation, getAutoControls, checkReproducible, listVersions } from "@/modules/reporting/summary";
import { FreezeButton } from "./freeze-button";

export default async function ResumenDetail({ params }: { params: Promise<{ companyId: string; periodId: string }> }) {
  const { companyId, periodId } = await params;
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!(await getCompanyContext(companyId, user.id))) redirect("/dashboard");
  const ctx = { companyId, userId: user.id };
  const s = await getIvaSummary(ctx, periodId);
  const conci = await getConciliation(ctx, periodId);
  const controles = await getAutoControls(ctx, periodId);
  const repro = await checkReproducible(ctx, periodId);
  const versions = await listVersions(ctx, periodId);
  const row = (k: string, v: string, href?: string) => (
    <tr key={k}><td>{k}</td><td>{href ? <a href={href}>{v}</a> : v}</td></tr>
  );
  return (
    <main>
      <h1>Resumen IVA</h1>
      <table><tbody>
        {row("Compras gravadas", s.comprasGravadas, `/c/${companyId}/reportes/libro-compras`)}
        {row("Compras exentas", s.comprasExentas)}
        {row("Crédito fiscal", s.creditoFiscal)}
        {row("Ventas gravadas", s.ventasGravadas, `/c/${companyId}/reportes/libro-ventas`)}
        {row("Ventas exentas", s.ventasExentas)}
        {row("Débito fiscal", s.debitoFiscal)}
        {row("Ret. IVA emitidas", s.retIvaEmitidas, `/c/${companyId}/retenciones`)}
        {row("Ret. ISLR emitidas", s.retIslrEmitidas, `/c/${companyId}/retenciones-islr`)}
        {row("Ret. recibidas aplicadas (informativo, sin neteo)", s.retRecibidasAplicadas, `/c/${companyId}/retenciones-recibidas`)}
        {row("Cuota del período (débito − crédito)", s.cuotaPeriodo)}
      </tbody></table>
      <h2>Conciliación ({conci.ok ? "cuadra" : "DIFERENCIAS"})</h2>
      <ul>
        {conci.items.map((i) => (
          <li key={i.nombre}>{i.nombre}: {i.esperado} vs {i.real} {i.ok ? "✓" : "✗"}</li>
        ))}
      </ul>
      <h2>Controles automáticos F8 ({controles.ok ? "0 hallazgos" : "con hallazgos"})</h2>
      <ul>
        {controles.items.map((i) => (
          <li key={i.key}>{i.hallazgos.length === 0 ? "✓" : "✗"} {i.nombre}{i.hallazgos.length > 0 ? `: ${i.hallazgos.join("; ")}` : ""}</li>
        ))}
      </ul>
      <h2>Versiones</h2>
      <p>Reproducible: {repro.match === null ? "sin versiones" : repro.match ? `sí (v${repro.version})` : "NO — cambió tras congelar"}</p>
      <ul>
        {versions.map((v) => (
          <li key={v.id}>v{v.version} · {v.sha256.slice(0, 16)}… · {v.generatedAt?.toISOString()}</li>
        ))}
      </ul>
      <FreezeButton companyId={companyId} periodId={periodId} />
    </main>
  );
}
