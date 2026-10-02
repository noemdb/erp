"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Add from "@mui/icons-material/Add";
import Save from "@mui/icons-material/Save";
import { Button } from "@/components/ui/button";
import { FieldError, HelpText, Input, Label } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { createConceptAction } from "@/modules/rules/actions";

export function ConceptDialog({ companyId }: { companyId: string }) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [codigo, setCodigo] = useState("");
  const [nombre, setNombre] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!codigo.trim() || !nombre.trim()) {
      setError("Código y nombre son requeridos.");
      return;
    }
    setBusy(true);
    try {
      const res = await createConceptAction(companyId, {
        codigo: codigo.trim(),
        nombre: nombre.trim(),
      });
      if (!res.ok) {
        setError(
          res.error.code === "DUPLICATE_DOCUMENT"
            ? "Ese código ya existe."
            : `${res.error.code}: ${res.error.message}`
        );
        return;
      }
      toast({ title: "Concepto creado", description: codigo.trim().toUpperCase(), variant: "success" });
      setOpen(false);
      setCodigo("");
      setNombre("");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Add aria-hidden />
        Nuevo concepto
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} label="Nuevo concepto ISLR">
        <h2 className="text-base font-semibold tracking-tight">
          Nuevo concepto ISLR
        </h2>
        <p className="mt-1 text-sm text-periwinkle-500">
          Solo los conceptos que la empresa usa (honorarios, alquileres…).
        </p>
        <form onSubmit={submit} noValidate className="mt-4 flex flex-col gap-4">
          <div>
            <Label htmlFor="conc-codigo">Código</Label>
            <Input
              id="conc-codigo"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              placeholder="HON"
              maxLength={50}
              autoComplete="off"
              disabled={busy}
              className="mt-1.5 font-mono uppercase"
            />
          </div>
          <div>
            <Label htmlFor="conc-nombre">Nombre</Label>
            <Input
              id="conc-nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Honorarios profesionales"
              maxLength={200}
              autoComplete="off"
              disabled={busy}
              className="mt-1.5"
            />
            <HelpText>La base por defecto es monto pagado.</HelpText>
          </div>
          {error && <FieldError>{error}</FieldError>}
          <div>
            <Button type="submit" disabled={busy}>
              <Save aria-hidden />
              {busy ? "Guardando…" : "Crear concepto"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
