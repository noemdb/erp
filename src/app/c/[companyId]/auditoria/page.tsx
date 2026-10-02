import { redirect } from "next/navigation";
import { getSessionUser } from "@/modules/identity/session";
import { getCompanyContext } from "@/modules/tenancy/repo";
import { listAuditEvents } from "@/modules/audit/queries";

export default async function AuditoriaPage({
  params,
  searchParams,
}: {
  params: Promise<{ companyId: string }>;
  searchParams: Promise<{ entityType?: string; entityId?: string }>;
}) {
  const { companyId } = await params;
  const sp = await searchParams;
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!(await getCompanyContext(companyId, user.id))) redirect("/dashboard");
  const rows = await listAuditEvents(
    { companyId, userId: user.id },
    { entityType: sp.entityType || undefined, entityId: sp.entityId || undefined },
  );
  const q = new URLSearchParams({ ...(sp.entityType ? { entityType: sp.entityType } : {}), ...(sp.entityId ? { entityId: sp.entityId } : {}) }).toString();
  return (
    <main>
      <h1>Bitácora (append-only)</h1>
      <p><a href={`/api/companies/${companyId}/audit/export?${q}`}>Exportar CSV</a></p>
      <table>
        <thead><tr><th>Cuándo</th><th>Acción</th><th>Entidad</th><th>Motivo</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}><td>{r.occurredAt?.toISOString()}</td><td>{r.action}</td><td>{r.entityType}:{r.entityId.slice(0, 8)}</td><td>{r.reason ?? "—"}</td></tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
