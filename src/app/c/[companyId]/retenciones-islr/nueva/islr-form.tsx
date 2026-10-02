"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { previewIslrAction, issueIslrAction } from "@/modules/withholdings/actions";

type SettlementEvent = {
  id: string;
  eventDate: string;
  eventType: "payment" | "account_credit";
  amount: string;
  currency: string;
  rif: string;
};
type Concept = { id: string; codigo: string; nombre: string };
type Candidate = {
  eligible: boolean;
  reason?: string;
  eventType?: string;
  fechaRetencion?: string;
  periodo?: string;
  eventAmount?: string;
  currency?: string;
  baseSujeta?: string;
  ruleVersionId?: string;
  porcentaje?: string;
  sustraendo?: string;
  condicionesRegla?: unknown;
  retainedAmount?: string;
  explanation?: string[];
};
type Preview = {
  criterion: "unset" | "payment_only" | "account_credit_or_payment";
  paymentOnly: Candidate;
  accountCreditOrPayment: Candidate;
  converged: boolean;
  canIssue: boolean;
  blockReason: string | null;
  retainedAmount: string | null;
  explanation: string[];
};

const eventLabels = { payment: "Pago", account_credit: "Abono en cuenta" };

function CandidateSummary({ title, candidate }: { title: string; candidate: Candidate }) {
  return (
    <section>
      <h3>{title}</h3>
      {!candidate.eligible ? (
        <p>{candidate.reason ?? "No evaluable con los datos disponibles."}</p>
      ) : (
        <>
          <p>
            Disparador: {candidate.eventType === "payment" ? eventLabels.payment : eventLabels.account_credit}{" "}
            · {candidate.fechaRetencion} · período {candidate.periodo}
          </p>
          <p>
            Base sujeta: {candidate.baseSujeta} · importe del evento: {candidate.eventAmount}{" "}
            {candidate.currency}
          </p>
          <p>
            Regla {candidate.ruleVersionId} · porcentaje {candidate.porcentaje} · sustraendo{" "}
            {candidate.sustraendo}
          </p>
          <p>
            UT/condiciones declaradas en la regla:{" "}
            {JSON.stringify(candidate.condicionesRegla ?? "sin dato explícito")}
          </p>
          <p>Retención estimada: {candidate.retainedAmount}</p>
          {candidate.explanation && (
            <ul>
              {candidate.explanation.map((step, index) => (
                <li key={index}>{step}</li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}

export function IslrForm({
  companyId,
  events,
  concepts,
}: {
  companyId: string;
  events: SettlementEvent[];
  concepts: Concept[];
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    settlementEventId: events[0]?.id ?? "",
    conceptId: concepts[0]?.id ?? "",
    base: "",
    fecha: new Date().toISOString().slice(0, 10),
  });

  async function doPreview() {
    setMessage(null);
    setPreview(null);
    const result = await previewIslrAction(companyId, {
      settlementEventId: form.settlementEventId,
      conceptId: form.conceptId,
      baseSujeta: form.base,
      fechaEmision: form.fecha,
    });
    if (!result.ok) setMessage(`${result.error.code}: ${result.error.message}`);
    else setPreview(result);
  }

  async function doIssue() {
    setBusy(true);
    setMessage(null);
    const result = await issueIslrAction(companyId, {
      settlementEventId: form.settlementEventId,
      conceptId: form.conceptId,
      baseSujeta: form.base,
      fechaEmision: form.fecha,
    });
    if (!result.ok) {
      setMessage(`${result.error.code}: ${result.error.message}`);
      setBusy(false);
    } else {
      router.push(`/c/${companyId}/retenciones-islr/${result.id}`);
    }
  }

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setPreview(null);
  }

  return (
    <div>
      <p>
        El sistema compara payment_only y account_credit_or_payment. La comparación es informativa: no
        constituye aprobación fiscal ni agrega una UT no registrada en la regla.
      </p>
      <label>
        Evento de liquidación
        <select
          value={form.settlementEventId}
          onChange={(event) => set("settlementEventId", event.target.value)}
        >
          {events.map((event) => (
            <option key={event.id} value={event.id}>
              {eventLabels[event.eventType]} · {event.eventDate} · {event.rif} · {event.amount}{" "}
              {event.currency}
            </option>
          ))}
        </select>
      </label>
      <label>
        Concepto
        <select value={form.conceptId} onChange={(event) => set("conceptId", event.target.value)}>
          {concepts.map((concept) => (
            <option key={concept.id} value={concept.id}>
              {concept.codigo} — {concept.nombre}
            </option>
          ))}
        </select>
      </label>
      <label>
        Base sujeta
        <input
          value={form.base}
          onChange={(event) => set("base", event.target.value)}
          pattern="^\\d+(\\.\\d{1,2})?$"
        />
      </label>
      <label>
        Fecha emisión
        <input type="date" value={form.fecha} onChange={(event) => set("fecha", event.target.value)} />
      </label>
      <button type="button" onClick={doPreview} disabled={!form.settlementEventId || !form.conceptId || busy}>
        Comparar criterios
      </button>
      {preview && (
        <div>
          <p>Criterio por empresa: {preview.criterion}</p>
          <CandidateSummary title="Escenario: solo pago" candidate={preview.paymentOnly} />
          <CandidateSummary
            title="Escenario: abono o pago, el primero"
            candidate={preview.accountCreditOrPayment}
          />
          <p>¿Convergen fecha, período, regla, base e importe? {preview.converged ? "Sí" : "No"}</p>
          {preview.canIssue ? (
            <button type="button" onClick={doIssue} disabled={busy}>
              {busy ? "Emitiendo…" : `Emitir · ${preview.retainedAmount}`}
            </button>
          ) : (
            <p role="alert">{preview.blockReason ?? "No se puede emitir con el criterio actual."}</p>
          )}
          {preview.explanation.length > 0 && (
            <ul>
              {preview.explanation.map((step, index) => (
                <li key={index}>{step}</li>
              ))}
            </ul>
          )}
        </div>
      )}
      {message && <p role="alert">{message}</p>}
    </div>
  );
}
