"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { assignMachineBranchAction } from "@/modules/tenancy/settings-actions";

export function AssignForm({ companyId, machineId, branches, current }: { companyId: string; machineId: string; branches: { id: string; nombre: string }[]; current: string | null }) {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const v = String(new FormData(e.currentTarget).get("branch"));
        const res = await assignMachineBranchAction(companyId, machineId, v || null);
        if (!res.ok) setMsg(`${res.error.code}: ${res.error.message}`);
        else router.refresh();
      }}
    >
      <select name="branch" defaultValue={current ?? ""}>
        <option value="">Sin sucursal</option>
        {branches.map((b) => <option key={b.id} value={b.id}>{b.nombre}</option>)}
      </select>
      <button type="submit">Asignar</button>
      {msg && <p role="alert">{msg}</p>}
    </form>
  );
}
