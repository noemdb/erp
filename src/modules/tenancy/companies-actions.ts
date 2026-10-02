"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/modules/identity/session";
import { createCompany, updateCompany } from "./companies";

export async function createCompanyAction(input: {
  rif: string;
  razonSocial: string;
  condicionIva?: "ordinario" | "especial" | "exento" | "no_contribuyente";
  domicilioFiscal?: string;
  nombreComercial?: string;
  telefono?: string;
  emailContacto?: string;
  colorDistintivo?: string;
  logoUrl?: string;
}) {
  const user = await getSessionUser();
  if (!user)
    return { ok: false as const, error: { code: "UNAUTHENTICATED", message: "Inicia sesión." } };
  const res = await createCompany(user.id, input);
  if (res.ok) {
    revalidatePath("/companies");
    revalidatePath("/dashboard");
  }
  return res;
}

export async function updateCompanyAction(
  companyId: string,
  input: {
    rif: string;
    razonSocial: string;
    condicionIva?: "ordinario" | "especial" | "exento" | "no_contribuyente";
    domicilioFiscal?: string;
    nombreComercial?: string;
    telefono?: string;
    emailContacto?: string;
    colorDistintivo?: string;
    logoUrl?: string;
  }
) {
  const user = await getSessionUser();
  if (!user)
    return { ok: false as const, error: { code: "UNAUTHENTICATED", message: "Inicia sesión." } };
  const res = await updateCompany({ companyId, userId: user.id }, input);
  if (res.ok) {
    revalidatePath("/companies");
    revalidatePath("/dashboard");
    revalidatePath(`/c/${companyId}`);
  }
  return res;
}
