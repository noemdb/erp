import { redirect } from "next/navigation";
import { getSessionUser, listMemberships } from "@/modules/identity/session";
import { authorize } from "@/modules/tenancy/authorize";
import { listUsersForAdmin } from "@/modules/identity/recovery";
import { ResetForm } from "./reset-form";

export default async function UsuariosPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const mems = await listMemberships(user.id);
  let ok = false;
  for (const m of mems) {
    if ((await authorize(m.companyId, user.id, "users.manage")).ok) {
      ok = true;
      break;
    }
  }
  if (!ok) redirect("/dashboard");
  const users = await listUsersForAdmin();
  return (
    <main>
      <h1>Usuarios (admin)</h1>
      <table>
        <thead><tr><th>Correo</th><th>Nombre</th><th>Empresas</th></tr></thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}><td>{u.email}</td><td>{u.name}</td><td>{u.companies.join(", ")}</td></tr>
          ))}
        </tbody>
      </table>
      <h2>Generar enlace de restablecimiento (un solo uso, entregar por canal externo)</h2>
      <ResetForm />
    </main>
  );
}
