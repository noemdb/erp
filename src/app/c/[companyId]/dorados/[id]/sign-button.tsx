"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/progress";
import { useToast } from "@/components/ui/toast";
import { signGoldenCaseAction } from "@/modules/goldens/actions";

const input = "w-full rounded-md border border-periwinkle-200 px-3 py-2 text-sm";
const label = "mb-1 block text-sm font-medium";

export function SignGoldenButton({ companyId, id }: { companyId: string; id: string }) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    setMsg(null);
    try {
      const r = await signGoldenCaseAction(companyId, id, {
        firmanteNombre: String(fd.get("firmanteNombre") ?? ""),
        firmanteDoc: String(fd.get("firmanteDoc") ?? ""),
        fuenteLegal: String(fd.get("fuenteLegal") ?? ""),
      });
      if (!r.ok) {
        const err = r.error as { code?: string; message?: string };
        setMsg(`${err.code ?? ""}: ${err.message ?? "No se pudo firmar."}`);
      } else {
        toast({ title: "Dorado firmado", variant: "success" });
        setOpen(false);
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>Firmar</Button>
      {open && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Firmar dorado">
          <div className="absolute inset-0 bg-[#120c27]/50" onClick={() => setOpen(false)} aria-hidden />
          <div className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-semibold">Firmar dorado {id}</h2>
            <p className="mt-1 text-sm text-periwinkle-500">
              Solo el contador firma. El hash queda en el archivo y se verifica sin el sistema.
            </p>
            <form onSubmit={onSubmit} className="mt-4 space-y-3">
              <div>
                <label className={label} htmlFor="sign-nombre">Firmante</label>
                <input id="sign-nombre" name="firmanteNombre" className={input} required minLength={3} />
              </div>
              <div>
                <label className={label} htmlFor="sign-doc">Cédula / RIF</label>
                <input id="sign-doc" name="firmanteDoc" className={input} required minLength={6} />
              </div>
              <div>
                <label className={label} htmlFor="sign-fuente">Fuente legal</label>
                <input id="sign-fuente" name="fuenteLegal" className={input} required minLength={5} placeholder="Norma + artículo, o criterio del contador" />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={busy}>Cancelar</Button>
                <Button type="submit" disabled={busy}>{busy ? (<><Spinner label="Firmando" /> Firmando…</>) : "Firmar"}</Button>
              </div>
            </form>
            {msg && (<p role="alert" className="mt-3 text-sm text-red-700">{msg}</p>)}
          </div>
        </div>
      )}
    </>
  );
}
