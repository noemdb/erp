import { redirect } from "next/navigation";
import { getSessionUser } from "@/modules/identity/session";
import { getCompanyContext } from "@/modules/tenancy/repo";
import { listMachines } from "@/modules/tenancy/settings";
import { AssignForm } from "./assign-form";

export default async function ZPage({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!(await getCompanyContext(companyId, user.id))) redirect("/dashboard");
  const { machines, branches } = await listMachines({ companyId, userId: user.id });
  return (
    <main>
      <h1>Máquinas fiscales y Z (G7)</h1>
      <table>
        <thead><tr><th>Serial</th><th>Sucursal</th><th>Asignar</th></tr></thead>
        <tbody>
          {machines.map((m) => (
            <tr key={m.id}><td>{m.serial}</td><td>{m.branchNombre}</td>
              <td><AssignForm companyId={companyId} machineId={m.id} branches={branches} current={m.branchId} /></td></tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
