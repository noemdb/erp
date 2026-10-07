"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/progress";
import { useToast } from "@/components/ui/toast";
import {
  updateDraftAction, submitDecisionAction, returnDecisionAction, approveDecisionAction,
  signDecisionAction, rejectDecisionAction, supersedeDecisionAction, linkDecisionAction,
} from "@/modules/rdf/actions";

type Props = {
  companyId: string;
  id: string;
  status: string;
  canPrepare: boolean;
  canSign: boolean;
  rules: { id: string; ruleKind: string | null; porcentaje: string | null; effectiveRange: string | null; status: string | null }[];
};

const input = "w-full rounded-md border border-periwinkle-200 px-3 py-2 text-sm";
const label = "mb-1 block text-sm font-medium";

export function DecisionFlow({ companyId, id, status, canPrepare, canSign, rules }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function run(p: Promise<{ ok: boolean; error?: unknown }>, okMsg: string) {
    setBusy(true);
    setMsg(null);
    try {
      const r = await p;
      if (!r.ok) {
        const e = r.error as { code?: string; message?: string };
        setMsg(`${e.code ?? ""}: ${e.message ?? "No se pudo avanzar."}`);
      } else {
        toast({ title: okMsg, variant: "success" });
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  async function onSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const ejemplo: Record<string, string> = {};
    const base = String(fd.get("base") ?? "").trim();
    if (base) ejemplo.base = base;
    await run(
      updateDraftAction(companyId, id, {
        decision: String(fd.get("decision") ?? "") || undefined,
        fundamentoNormativo: String(fd.get("fundamento") ?? "") || undefined,
        ejemploNumerico: Object.keys(ejemplo).length > 0 ? ejemplo : undefined,
        resultadoEsperado: String(fd.get("resultado") ?? "") || undefined,
        impactoSistema: String(fd.get("impacto") ?? "") || undefined,
      }),
      "Borrador guardado",
    );
  }

  async function onSign(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await run(
      signDecisionAction(companyId, id, {
        firmanteNombre: String(fd.get("firmanteNombre") ?? ""),
        firmanteDoc: String(fd.get("firmanteDoc") ?? ""),
        motivo: String(fd.get("motivo") ?? "") || undefined,
      }),
      "Decisión firmada",
    );
  }

  async function onMotivo(e: React.FormEvent<HTMLFormElement>, fn: (m: { motivo: string }) => Promise<{ ok: boolean; error?: unknown }>, okMsg: string) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await run(fn({ motivo: String(fd.get("motivo") ?? "") }), okMsg);
  }

  async function onLink(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await run(
      linkDecisionAction(companyId, id, { ruleId: String(fd.get("ruleId") ?? ""), rol: "autoriza", nota: String(fd.get("nota") ?? "") || undefined }),
      "Regla vinculada",
    );
  }

  const editable = (status === "draft" || status === "returned") && canPrepare;
  const linkable = ["draft", "in_review", "approved", "signed"].includes(status) && canSign;

  return (
    <div className="space-y-6">
      {editable && (
        <form onSubmit={onSave} className="space-y-3">
          <h3 className="text-sm font-semibold">Completar borrador</h3>
          <div><label className={label} htmlFor="rdf-decision">Decisión (una frase)</label>
            <textarea id="rdf-decision" name="decision" className={input} rows={2} minLength={10} /></div>
          <div><label className={label} htmlFor="rdf-fundamento">Fundamento normativo</label>
            <textarea id="rdf-fundamento" name="fundamento" className={input} rows={2} minLength={10} placeholder="Norma + artículo, o criterio del contador motivado" /></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label className={label} htmlFor="rdf-base">Ejemplo · base</label>
              <input id="rdf-base" name="base" className={input} placeholder="1572.15" /></div>
            <div><label className={label} htmlFor="rdf-resultado">Resultado esperado</label>
              <input id="rdf-resultado" name="resultado" className={input} placeholder="1179.12" pattern="\d+\.\d{2}" /></div>
          </div>
          <div><label className={label} htmlFor="rdf-impacto">Impacto en sistema</label>
            <input id="rdf-impacto" name="impacto" className={input} placeholder="ADR / regla / dorado tocados" /></div>
          <Button type="submit" disabled={busy}>{busy ? (<><Spinner label="Guardando" /> Guardando…</>) : "Guardar borrador"}</Button>
        </form>
      )}

      {editable && (
        <div><Button disabled={busy} onClick={() => run(submitDecisionAction(companyId, id), "Enviada a revisión")}>Enviar a revisión</Button></div>
      )}
      {status === "in_review" && canSign && (
        <div className="flex flex-wrap gap-2">
          <Button disabled={busy} onClick={() => run(approveDecisionAction(companyId, id), "Aprobada")}>Aprobar</Button>
        </div>
      )}
      {status === "approved" && canSign && (
        <form onSubmit={onSign} className="space-y-3">
          <h3 className="text-sm font-semibold">Firmar (inmutable + sha256)</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label className={label} htmlFor="rdf-firmante">Firmante</label>
              <input id="rdf-firmante" name="firmanteNombre" className={input} required minLength={5} /></div>
            <div><label className={label} htmlFor="rdf-doc">Cédula / RIF</label>
              <input id="rdf-doc" name="firmanteDoc" className={input} required minLength={5} /></div>
          </div>
          <div><label className={label} htmlFor="rdf-motivo-firma">Motivo (obligatorio si usted preparó el borrador y hay otro contador)</label>
            <input id="rdf-motivo-firma" name="motivo" className={input} /></div>
          <Button type="submit" disabled={busy}>{busy ? (<><Spinner label="Firmando" /> Firmando…</>) : "Firmar decisión"}</Button>
        </form>
      )}
      {(status === "in_review" || status === "approved") && canSign && (
        <div className="grid gap-4 sm:grid-cols-2">
          <form onSubmit={(e) => onMotivo(e, (m) => returnDecisionAction(companyId, id, m), "Devuelta a borrador")} className="space-y-2">
            <label className={label} htmlFor="rdf-motivo-dev">Devolver a borrador</label>
            <input id="rdf-motivo-dev" name="motivo" className={input} required minLength={3} placeholder="Motivo" />
            <Button type="submit" variant="outline" disabled={busy}>Devolver</Button>
          </form>
          <form onSubmit={(e) => onMotivo(e, (m) => rejectDecisionAction(companyId, id, m), "Rechazada")} className="space-y-2">
            <label className={label} htmlFor="rdf-motivo-rech">Rechazar</label>
            <input id="rdf-motivo-rech" name="motivo" className={input} required minLength={3} placeholder="Motivo" />
            <Button type="submit" variant="outline" disabled={busy}>Rechazar</Button>
          </form>
        </div>
      )}
      {(status === "signed" || status === "applied") && canSign && (
        <form onSubmit={(e) => onMotivo(e, (m) => supersedeDecisionAction(companyId, id, m), "Reemplazada")} className="space-y-2">
          <label className={label} htmlFor="rdf-motivo-sup">Reemplazar (la corrección es un RDF nuevo que cita a este)</label>
          <input id="rdf-motivo-sup" name="motivo" className={input} required minLength={3} placeholder="Motivo" />
          <Button type="submit" variant="outline" disabled={busy}>Marcar reemplazada</Button>
        </form>
      )}
      {linkable && (
        <form onSubmit={onLink} className="space-y-3">
          <h3 className="text-sm font-semibold">Vincular regla que autoriza (cobertura para activar)</h3>
          <div><label className={label} htmlFor="rdf-rule">Regla en borrador / revisión / aprobación</label>
            <select id="rdf-rule" name="ruleId" className={input} required defaultValue="">
              <option value="" disabled>Elegir regla…</option>
              {rules.filter((r) => ["draft", "in_review", "approved"].includes(r.status ?? "")).map((r) => (
                <option key={r.id} value={r.id}>{r.ruleKind?.toUpperCase()} · {r.porcentaje} · {r.effectiveRange} · {r.status}</option>
              ))}
            </select></div>
          <div><label className={label} htmlFor="rdf-nota">Nota (opcional)</label>
            <input id="rdf-nota" name="nota" className={input} maxLength={500} /></div>
          <Button type="submit" variant="outline" disabled={busy}>Vincular como autoriza</Button>
        </form>
      )}
      {msg && (<p role="alert" className="text-sm text-red-700">{msg}</p>)}
    </div>
  );
}
