import { redirect } from "next/navigation";
import { getSessionUser } from "@/modules/identity/session";
import { getPartyWithProfiles } from "@/modules/parties/service";
import { ProfileForm } from "./profile-form";

export default async function TerceroDetallePage({ params }: { params: Promise<{ companyId: string; partyId: string }> }) {
  const { companyId, partyId } = await params;
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const data = await getPartyWithProfiles({ companyId, userId: user.id }, partyId);
  if (!data) redirect(`/c/${companyId}/terceros`);
  return (
    <main>
      <h1>{data.party.razonSocial} ({data.party.rifOriginal})</h1>
      <h2>Historial fiscal</h2>
      <table>
        <thead><tr><th>Vigencia</th><th>Tipo</th><th>Ret. IVA</th><th>Ret. ISLR</th></tr></thead>
        <tbody>
          {data.profiles.map((p) => (
            <tr key={p.id}><td>{p.effectiveRange}</td><td>{p.tipoPersona}</td><td>{p.sujetoRetencionIva ? "sí" : "no"}</td><td>{p.sujetoRetencionIslr ? "sí" : "no"}</td></tr>
          ))}
        </tbody>
      </table>
      <h2>Nuevo perfil</h2>
      <ProfileForm companyId={companyId} partyId={partyId} />
    </main>
  );
}
