"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import InfoOutlined from "@mui/icons-material/InfoOutlined";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Spinner } from "@/components/ui/progress";
import { useToast } from "@/components/ui/toast";
import { createDecisionAction } from "@/modules/rdf/actions";
import { RDF_GAP_ES, RDF_GAP_DESC } from "@/modules/rdf/labels";

const GAPS = ["G1", "G2", "G4", "G8", "G9", "ISLR", "OTRO"] as const;

export function DecisionForm({ companyId }: { companyId: string }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [gap, setGap] = useState<string>("G8");
  const [leyenda, setLeyenda] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const fd = new FormData(e.currentTarget);
    const res = await createDecisionAction(companyId, {
      gap: String(fd.get("gap")) as (typeof GAPS)[number],
      titulo: String(fd.get("titulo") ?? ""),
      pregunta: String(fd.get("pregunta") ?? ""),
      alternativas: [
        { letra: "A", descripcion: String(fd.get("altA") ?? ""), impacto_numerico: String(fd.get("impA") ?? "") || undefined },
        { letra: "B", descripcion: String(fd.get("altB") ?? ""), impacto_numerico: String(fd.get("impB") ?? "") || undefined },
      ],
      ruleKind: (String(fd.get("ruleKind") ?? "") || null) as "iva" | "islr" | null,
    });
    if (!res.ok) {
      const er = res.error as { code?: string; message?: string };
      setMsg(`${er.code ?? ""}: ${er.message ?? "No se pudo crear."}`);
    } else {
      toast({ title: `Borrador ${res.codigo}`, variant: "success" });
      router.push(`/c/${companyId}/decisiones/${res.id}`);
    }
    setBusy(false);
  }

  const input = "w-full rounded-md border border-periwinkle-200 px-3 py-2 text-sm";
  const label = "mb-1 block text-sm font-medium";
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label htmlFor="rdf-gap" className={label}>Tema fiscal</label>
        <div className="flex items-start gap-2">
          <select id="rdf-gap" name="gap" className={input} value={gap} onChange={(e) => setGap(e.target.value)}>
            {GAPS.map((g) => (<option key={g} value={g}>{RDF_GAP_ES[g] ?? g}</option>))}
          </select>
          <Button type="button" variant="outline" onClick={() => setLeyenda(true)} aria-label="Ver leyenda de temas fiscales" className="shrink-0 px-3">
            <InfoOutlined aria-hidden />
          </Button>
        </div>
        <p className="mt-1.5 text-sm text-periwinkle-500" aria-live="polite">{RDF_GAP_DESC[gap] ?? ""}</p>
        <Modal open={leyenda} onClose={() => setLeyenda(false)} label="Leyenda de temas fiscales">
          <div className="p-6">
            <h2 className="text-base font-semibold tracking-tight">Temas fiscales</h2>
            <p className="mt-1 text-sm text-periwinkle-500">Cada decisión pertenece a un tema. Elija el que corresponda a su pregunta.</p>
            <dl className="mt-4 space-y-3">
              {GAPS.map((g) => (
                <div key={g} className="rounded-md bg-periwinkle-50 px-3 py-2.5">
                  <dt className="text-sm font-semibold">{RDF_GAP_ES[g] ?? g}</dt>
                  <dd className="mt-0.5 text-sm text-periwinkle-600">{RDF_GAP_DESC[g] ?? ""}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-5 flex justify-end">
              <Button type="button" onClick={() => setLeyenda(false)}>Entendido</Button>
            </div>
          </div>
        </Modal>
      </div>
      <div>
        <label htmlFor="rdf-titulo" className={label}>Título</label>
        <input id="rdf-titulo" name="titulo" className={input} required minLength={5} maxLength={140} placeholder="Redondeo por línea o por total" />
      </div>
      <div>
        <label htmlFor="rdf-pregunta" className={label}>Pregunta fiscal (una frase)</label>
        <textarea id="rdf-pregunta" name="pregunta" className={input} required minLength={10} rows={2} placeholder="¿El 75 % se redondea línea por línea o sobre el total?" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="rdf-altA" className={label}>Opción A</label>
          <textarea id="rdf-altA" name="altA" className={input} required minLength={10} rows={3} />
          <input name="impA" className={`${input} mt-2`} placeholder="Impacto numérico (p. ej. 1179.12)" />
        </div>
        <div>
          <label htmlFor="rdf-altB" className={label}>Opción B</label>
          <textarea id="rdf-altB" name="altB" className={input} required minLength={10} rows={3} />
          <input name="impB" className={`${input} mt-2`} placeholder="Impacto numérico (p. ej. 1179.11)" />
        </div>
      </div>
      <div>
        <label htmlFor="rdf-ruleKind" className={label}>Impuesto que autoriza (cobertura)</label>
        <select id="rdf-ruleKind" name="ruleKind" className={input} defaultValue="iva">
          <option value="iva">IVA</option>
          <option value="islr">ISLR</option>
          <option value="">Sin cobertura directa</option>
        </select>
      </div>
      <Button type="submit" disabled={busy}>
        {busy ? (<><Spinner label="Creando borrador" /> Creando…</>) : ("Crear borrador")}
      </Button>
      {msg && (<p role="alert" className="text-sm text-red-700">{msg}</p>)}
    </form>
  );
}
