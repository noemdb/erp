import { authorize } from "@/modules/tenancy/authorize";
import { listMemberships } from "./session";

/** Permiso users.manage en ALGUNA empresa (misma regla que la página /usuarios). */
export async function canManageUsersAnywhere(userId: string): Promise<boolean> {
  const mems = await listMemberships(userId);
  for (const m of mems) {
    if ((await authorize(m.companyId, userId, "users.manage")).ok) return true;
  }
  return false;
}
