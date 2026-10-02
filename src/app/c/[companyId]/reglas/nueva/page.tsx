import { redirect } from "next/navigation";
import { getSessionUser } from "@/modules/identity/session";
import { getCompanyContext } from "@/modules/tenancy/repo";
import { listConcepts } from "@/modules/withholdings/issue-islr";
import { DraftForm } from "./draft-form";

export default async function NuevaReglaPage({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!(await getCompanyContext(companyId, user.id))) redirect("/dashboard");
  const concepts = await listConcepts({ companyId, userId: user.id });
  return (
    <main>
      <h1>Nuevo borrador de regla</h1>
      <DraftForm companyId={companyId} concepts={concepts} />
    </main>
  );
}
