import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { companies, companyUser } from "@/db/schema";
import { authorize } from "./authorize";
import { RifSchema } from "@/modules/parties/service";

export const CreateCompanySchema = z.object({
  rif: z.string().min(3).max(25),
  razonSocial: z.string().min(2).max(200),
  condicionIva: z.enum(["ordinario", "especial", "exento", "no_contribuyente"]).optional(),
  domicilioFiscal: z.string().max(300).optional(),
  nombreComercial: z.string().max(200).optional(),
  telefono: z.string().max(50).optional(),
  emailContacto: z.string().email("Correo inválido").max(150).optional().or(z.literal("")),
  colorDistintivo: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Color inválido (ej. #352574)").optional().or(z.literal("")),
  logoUrl: z.string().url("URL inválida").max(500).optional().or(z.literal("")),
});

const orNull = (v: string | undefined) => v?.trim() || null;

export type CreateCompanyResult =
  | { ok: true; id: string }
  | { ok: false; error: { code: string; message: string } };

/** Alta de empresa + membresía admin para quien la crea. */
export async function createCompany(
  userId: string,
  input: z.input<typeof CreateCompanySchema>
): Promise<CreateCompanyResult> {
  const parsed = CreateCompanySchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: { code: "VALIDATION_ERROR", message: "Datos inválidos." } };
  const rifCheck = RifSchema.safeParse(parsed.data.rif);
  if (!rifCheck.success)
    return { ok: false, error: { code: "VALIDATION_ERROR", message: "RIF inválido (ej. J-12345678-9)." } };
  const rif = rifCheck.data;

  const dup = await db
    .select({ id: companies.id })
    .from(companies)
    .where(eq(companies.rif, rif))
    .limit(1);
  if (dup[0])
    return { ok: false, error: { code: "DUPLICATE_COMPANY", message: "Ya existe una empresa con ese RIF." } };

  try {
    const [company] = await db
      .insert(companies)
      .values({
        rif,
        rifOriginal: parsed.data.rif.trim(),
        razonSocial: parsed.data.razonSocial.trim(),
        condicionIva: parsed.data.condicionIva ?? "ordinario",
        domicilioFiscal: orNull(parsed.data.domicilioFiscal),
        nombreComercial: orNull(parsed.data.nombreComercial),
        telefono: orNull(parsed.data.telefono),
        emailContacto: orNull(parsed.data.emailContacto),
        colorDistintivo: orNull(parsed.data.colorDistintivo),
        logoUrl: orNull(parsed.data.logoUrl),
      })
      .returning({ id: companies.id });
    if (!company) throw new Error("insert vacío");
    await db
      .insert(companyUser)
      .values({ companyId: company.id, userId, role: "admin" });
    return { ok: true, id: company.id };
  } catch (e) {
    if (typeof e === "object" && e !== null && "code" in e && (e as { code: string }).code === "23505")
      return { ok: false, error: { code: "DUPLICATE_COMPANY", message: "Ya existe una empresa con ese RIF." } };
    throw e;
  }
}

export const UpdateCompanySchema = CreateCompanySchema;

/** Edición de datos fiscales. Requiere `companies.manage` (admin). */
export async function updateCompany(
  ctx: { companyId: string; userId: string },
  input: z.input<typeof UpdateCompanySchema>
): Promise<CreateCompanyResult> {
  const auth = await authorize(ctx.companyId, ctx.userId, "companies.manage");
  if (!auth.ok)
    return { ok: false, error: { code: "FORBIDDEN", message: "Solo el administrador puede editar la empresa." } };
  const parsed = UpdateCompanySchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: { code: "VALIDATION_ERROR", message: "Datos inválidos." } };
  const rifCheck = RifSchema.safeParse(parsed.data.rif);
  if (!rifCheck.success)
    return { ok: false, error: { code: "VALIDATION_ERROR", message: "RIF inválido (ej. J-12345678-9)." } };
  const rif = rifCheck.data;

  const dup = await db
    .select({ id: companies.id })
    .from(companies)
    .where(eq(companies.rif, rif))
    .limit(1);
  if (dup[0] && dup[0].id !== ctx.companyId)
    return { ok: false, error: { code: "DUPLICATE_COMPANY", message: "Ya existe otra empresa con ese RIF." } };

  try {
    await db
      .update(companies)
      .set({
        rif,
        rifOriginal: parsed.data.rif.trim(),
        razonSocial: parsed.data.razonSocial.trim(),
        condicionIva: parsed.data.condicionIva ?? "ordinario",
        domicilioFiscal: orNull(parsed.data.domicilioFiscal),
        nombreComercial: orNull(parsed.data.nombreComercial),
        telefono: orNull(parsed.data.telefono),
        emailContacto: orNull(parsed.data.emailContacto),
        colorDistintivo: orNull(parsed.data.colorDistintivo),
        logoUrl: orNull(parsed.data.logoUrl),
        updatedAt: new Date(),
      })
      .where(eq(companies.id, ctx.companyId));
    return { ok: true, id: ctx.companyId };
  } catch (e) {
    if (typeof e === "object" && e !== null && "code" in e && (e as { code: string }).code === "23505")
      return { ok: false, error: { code: "DUPLICATE_COMPANY", message: "Ya existe otra empresa con ese RIF." } };
    throw e;
  }
}
