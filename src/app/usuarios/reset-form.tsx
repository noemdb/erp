"use client";

import { useState } from "react";
import { issueResetLinkAction } from "@/modules/identity/recovery-actions";

export function ResetForm() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const res = await issueResetLinkAction(email);
        if (!res.ok) setMsg(`${res.error.code}: ${res.error.message}`);
        else setMsg(`Enlace (única vez, cópialo ahora): ${res.link}`);
      }}
    >
      <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="correo" type="email" required />
      <button type="submit">Generar enlace</button>
      {msg && <p role="status">{msg}</p>}
    </form>
  );
}
