"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Save from "@mui/icons-material/Save";
import { Button } from "@/components/ui/button";
import { HelpText, Input, Label, Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { upsertPartyAction } from "@/modules/parties/actions";

export function EditPartyForm({
  companyId,
  rif,
  razonSocial,
  direccionFiscal,
}: {
  companyId: string;
  rif: string;
  razonSocial: string;
  direccionFiscal: string | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const [razon, setRazon] = useState(razonSocial);
  const [direccion, setDireccion] = useState(direccionFiscal ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const dirty =
    razon.trim() !== razonSocial || (direccion.trim() || "") !== (direccionFiscal ?? "");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (razon.trim().length < 2) {
      setError("La razón social necesita al menos 2 caracteres.");
      return;
    }
    setBusy(true);
    try {
      const res = await upsertPartyAction(companyId, {
        rif,
        razonSocial: razon.trim(),
        direccionFiscal: direccion.trim() || undefined,
      });
      if (!res.ok) {
        setError(`${res.error.code}: ${res.error.message}`);
        return;
      }
      toast({ title: "Tercero actualizado", variant: "success" });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <div>
        <Label htmlFor="edit-razon">Razón social</Label>
        <Input
          id="edit-razon"
          value={razon}
          onChange={(e) => setRazon(e.target.value)}
          maxLength={200}
          required
          disabled={busy}
          autoComplete="off"
          className="mt-1.5"
        />
      </div>
      <div>
        <Label htmlFor="edit-direccion">Dirección fiscal</Label>
        <Textarea
          id="edit-direccion"
          value={direccion}
          onChange={(e) => setDireccion(e.target.value)}
          maxLength={500}
          rows={2}
          disabled={busy}
          className="mt-1.5"
        />
        <HelpText>El RIF no se edita: identifica al tercero.</HelpText>
      </div>
      {error && (
        <p
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800"
        >
          {error}
        </p>
      )}
      <div>
        <Button type="submit" disabled={busy || !dirty}>
          <Save aria-hidden />
          {busy ? "Guardando…" : "Guardar cambios"}
        </Button>
      </div>
    </form>
  );
}
