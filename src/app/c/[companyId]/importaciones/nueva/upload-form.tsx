"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import CloudUpload from "@mui/icons-material/CloudUpload";
import { Button } from "@/components/ui/button";
import { HelpText, Input, Label } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";

const MAX_HINT_MB = 10;

const errorEs = (code: string, fallback: string): string => {
  switch (code) {
    case "UNAUTHENTICATED":
      return "Tu sesión venció. Entra de nuevo.";
    case "FORBIDDEN":
      return "Sin permiso para subir archivos.";
    case "RATE_LIMITED":
      return "Demasiadas subidas. Espera un minuto.";
    case "VALIDATION_ERROR":
      return fallback;
    default:
      return fallback;
  }
};

export function UploadForm({ companyId }: { companyId: string }) {
  const router = useRouter();
  const toast = useToast();
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const file = fd.get("file");
    if (!(file instanceof File) || file.size === 0) {
      setError("Elige un archivo CSV no vacío.");
      return;
    }
    if (file.size > MAX_HINT_MB * 1024 * 1024) {
      setError(
        `El archivo supera ~${MAX_HINT_MB} MB. El servidor lo rechazará: divídelo o comprímelo.`
      );
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/companies/${companyId}/imports/upload`, {
        method: "POST",
        body: fd,
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        const code = json?.error?.code ?? "";
        const msg = json?.error?.message ?? "No se pudo subir el archivo.";
        setError(errorEs(code, `${code ? `${code}: ` : ""}${msg}`));
        return;
      }
      const batchId = json?.data?.batchId as string | undefined;
      if (json?.data?.deduped) {
        toast({
          title: "Archivo ya importado",
          description: "Se abrió el lote existente, sin duplicar.",
          variant: "info",
        });
      } else {
        toast({ title: "CSV subido", description: "Lote creado para validar.", variant: "success" });
      }
      if (batchId) router.push(`/c/${companyId}/importaciones/${batchId}`);
      else router.push(`/c/${companyId}/importaciones`);
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  const selectCls =
    "mt-1.5 h-9 w-full rounded-md border border-periwinkle-300 bg-white px-2.5 text-sm outline-none transition-colors focus-visible:border-[#37c8a1] focus-visible:ring-2 focus-visible:ring-[#37c8a1]/30 disabled:opacity-50";

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="up-kind">Tipo de contenido</Label>
          <select id="up-kind" name="kind" defaultValue="purchases" disabled={busy} className={selectCls}>
            <option value="purchases">Compras</option>
            <option value="sales">Ventas</option>
            <option value="iva_withholdings">Retenciones IVA</option>
            <option value="islr_withholdings">Retenciones ISLR</option>
            <option value="z_reports">Reportes Z</option>
          </select>
          <HelpText>Qué documentos produce este archivo.</HelpText>
        </div>
        <div>
          <Label htmlFor="up-source">Fuente</Label>
          <select id="up-source" name="sourceSystem" defaultValue="legacy_accounting" disabled={busy} className={selectCls}>
            <option value="legacy_accounting">Software legacy</option>
            <option value="fiscal_machine">Máquina fiscal</option>
            <option value="manual">Manual</option>
          </select>
          <HelpText>De qué sistema sale el archivo.</HelpText>
        </div>
      </div>

      <div>
        <Label htmlFor="up-file">Archivo</Label>
        <Input
          id="up-file"
          name="file"
          type="file"
          accept=".csv,.txt,text/csv,text/plain"
          required
          disabled={busy}
          onChange={(e) => {
            const f = e.target.files?.[0];
            setFileName(f?.name ?? null);
            setFileSize(f?.size ?? null);
          }}
          className="mt-1.5"
        />
        <HelpText>
          {fileName
            ? `${fileName} · ${(fileSize! / 1024).toFixed(1)} KB`
            : `CSV de texto, hasta ~${MAX_HINT_MB} MB.`}
        </HelpText>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800"
        >
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={busy}>
          <CloudUpload aria-hidden />
          {busy ? "Subiendo…" : "Subir"}
        </Button>
        <Button asChild variant="outline">
          <Link href={`/c/${companyId}/importaciones`}>Cancelar</Link>
        </Button>
      </div>
    </form>
  );
}
