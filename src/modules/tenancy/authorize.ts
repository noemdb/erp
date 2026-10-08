import { eq, and } from "drizzle-orm";
import { db } from "@/db/client";
import { companyUser } from "@/db/schema";

export type Role = "admin" | "administrativo" | "contador" | "auditor" | "supplier";

/** Permisos mínimos v1 (matriz completa en SECURITY.md). audit.read: solo lectura para todos los roles con acceso a la empresa (API.md). */
const ROLE_ACTIONS: Record<Role, string[]> = {
  admin: ["users.manage", "companies.manage", "reports.read", "audit.read"],
  administrativo: ["docs.create", "imports.run", "reports.read", "audit.read"],
  contador: [
    "docs.create",
    "imports.run",
    "rules.edit",
    "goldens.sign",
    "withholdings.issue",
    "periods.close",
    "reports.read",
    "audit.read",
  ],
  auditor: ["reports.read", "audit.read"],
  supplier: [],
};

export async function getUserRole(companyId: string, userId: string): Promise<Role | null> {
  const rows = await db
    .select({ role: companyUser.role })
    .from(companyUser)
    .where(and(eq(companyUser.companyId, companyId), eq(companyUser.userId, userId)))
    .limit(1);
  const role = rows[0]?.role;
  return (role as Role) ?? null;
}

/** Una sola capa de autorización: rol × empresa. Sin membresía activa → denegado. */
export async function authorize(
  companyId: string,
  userId: string,
  action: string,
): Promise<{ ok: true; role: Role } | { ok: false; role: null }> {
  const role = await getUserRole(companyId, userId);
  if (!role) return { ok: false, role: null };
  if (role === "admin") return { ok: true, role };
  const allowed = ROLE_ACTIONS[role]?.includes(action) ?? false;
  return allowed ? { ok: true, role } : { ok: false, role: null };
}
