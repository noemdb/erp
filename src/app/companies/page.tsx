import { redirect } from "next/navigation";

// Ruta en desuso por ahora: las funcionalidades de empresas viven en
// /dashboard. Se evaluará su uso en el futuro.
export default async function CompaniesAlias() {
  redirect("/dashboard");
}
