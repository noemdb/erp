"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { consumeResetLinkAction } from "@/modules/identity/recovery-actions";

export default function RecuperarPage({ params }: { params: Promise<{ token: string }> }) {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  const [pw, setPw] = useState("");
  return (
    <main>
      <h1>Restablecer contraseña</h1>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const { token } = await params;
          const res = await consumeResetLinkAction(token, pw);
          if (!res.ok) setMsg(`${res.error.code}: ${res.error.message}`);
          else router.push("/login");
        }}
      >
        <label>Nueva contraseña (mínimo 10) <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} required /></label>
        <button type="submit">Cambiar e invalidar sesiones</button>
        {msg && <p role="alert">{msg}</p>}
      </form>
    </main>
  );
}
