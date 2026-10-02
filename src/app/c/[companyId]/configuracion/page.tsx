import { redirect } from "next/navigation";
import { getSessionUser } from "@/modules/identity/session";
import { getCompanyContext } from "@/modules/tenancy/repo";
import { getSalesMode } from "@/modules/tenancy/settings";
import { ModeForm } from "./mode-form";

export default async function ConfigPage({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!(await getCompanyContext(companyId, user.id))) redirect("/dashboard");
  const mode = await getSalesMode({ companyId, userId: user.id });
  return (
    <main>
      <h1>Configuración fiscal (contador)</h1>
      <p>Libro de Ventas se alimenta de: <strong>{mode === "z" ? "reportes Z" : "facturas individuales"}</strong> (G7, sin mezcla por período).</p>
      <ModeForm companyId={companyId} mode={mode} />
    </main>
  );
}
