"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Cancel from "@mui/icons-material/Cancel";
import CheckCircle from "@mui/icons-material/CheckCircle";
import CompareArrows from "@mui/icons-material/CompareArrows";
import Lock from "@mui/icons-material/Lock";
import WarningAmber from "@mui/icons-material/WarningAmber";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { previewIslrAction, issueIslrAction } from "@/modules/withholdings/actions";

type SettlementEvent = {
  id: string;
  eventDate: string;
  eventType: "payment" | "account_credit";
  amount: string;
  currency: string;
  rif: string;
  allocated?: string;
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

const errorEs: Record<string, string> = {
  VALIDATION_ERROR: "Revisa evento, concepto y base.",
  G2_EVENT_REVIEW_REQUIRED: "El criterio o el evento no permite emitir: revisa asignaciones y convergencia.",
  PERIOD_CLOSED: "El período del evento está cerrado.",
  SERIES_NOT_FOUND: "Serie de numeración ISLR no configurada (G9).",
  FORBIDDEN: "Solo el contador puede emitir.",
};

const inputCls =
  "flex h-10 w-full rounded-md border border-periwinkle-300 bg-white px-3 py-2 text-sm text-periwinkle-900 shadow-sm transition-colors outline-none placeholder:text-periwinkle-400 focus-visible:border-[#37c8a1] focus-visible:ring-2 focus-visible:ring-[#37c8a1]/30 disabled:cursor-not-allowed disabled:opacity-50";
const labelCls = "text-sm font-medium text-periwinkle-700";
const helpCls = "text-xs text-periwinkle-400";

function fmtMonto(s: string | null | undefined): string {
  const n = Number(s ?? 0);
  if (!Number.isFinite(n)) return String(s ?? "—");
  return n.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function CandidateCard({ title, candidate, preferred }: { title: string; candidate: Candidate; preferred?: boolean }) {
  return (
    <Card className={cn("rounded-lg", preferred && "border-[#352574]/40")}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm tracking-tight">{title}</CardTitle>
          <Badge variant={candidate.eligible ? "success" : "muted"}>
            {candidate.eligible ? "Evaluable" : "No evaluable"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-2 text-sm">
        {!candidate.eligible ? (
          <p className="text-periwinkle-500">{candidate.reason ?? "No evaluable con los datos disponibles."}</p>
        ) : (
          <>
            <p>
              Disparador:{" "}
              <strong>{candidate.eventType === "payment" ? eventLabels.payment : eventLabels.account_credit}</strong>{" "}
              · <span className="font-mono">{candidate.fechaRetencion}</span> · período{" "}
              <span className="font-mono">{candidate.periodo}</span>
            </p>
            <p>
              Base sujeta <span className="font-mono font-semibold">{fmtMonto(candidate.baseSujeta)}</span> ·
              evento <span className="font-mono">{fmtMonto(candidate.eventAmount)} {candidate.currency}</span>
            </p>
            <p className="break-all font-mono text-xs text-periwinkle-500">
              Regla {candidate.ruleVersionId} · {candidate.porcentaje}% · sustraendo {candidate.sustraendo}
            </p>
            <p className="text-xs text-periwinkle-500">
              UT/condiciones de la regla: {JSON.stringify(candidate.condicionesRegla ?? "sin dato explícito")}
            </p>
            <p className="font-mono text-base font-bold">
              Retención estimada: {fmtMonto(candidate.retainedAmount)}
            </p>
            {candidate.explanation && candidate.explanation.length > 0 && (
              <ol className="list-decimal space-y-1 pl-5 text-xs text-periwinkle-500">
                {candidate.explanation.map((step, index) => (
                  <li key={index}>{step}</li>
                ))}
              </ol>
            )}
          </>
        )}
      </CardContent>
    </Card>
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
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [form, setForm] = useState({
    settlementEventId: events[0]?.id ?? "",
    conceptId: concepts[0]?.id ?? "",
    base: "",
    fecha: new Date().toISOString().slice(0, 10),
  });

  const selectedEvent = events.find((e) => e.id === form.settlementEventId);
  const baseOk = form.base.trim() !== "" && /^\d+(\.\d{1,2})?$/.test(form.base.trim()) && Number(form.base) > 0;

  async function doPreview() {
    setBusy("preview");
    setMessage(null);
    setPreview(null);
    try {
      const result = await previewIslrAction(companyId, {
        settlementEventId: form.settlementEventId,
        conceptId: form.conceptId,
        baseSujeta: form.base.trim(),
        fechaEmision: form.fecha,
      });
      if (!result.ok) {
        const code = (result.error as { code: string }).code;
        const msg = (result.error as { message: string }).message;
        setMessage(`${code}: ${errorEs[code] ?? msg}`);
      } else {
        setPreview(result);
      }
    } finally {
      setBusy(null);
    }
  }

  async function doIssue() {
    setBusy("issue");
    setMessage(null);
    try {
      const result = await issueIslrAction(companyId, {
        settlementEventId: form.settlementEventId,
        conceptId: form.conceptId,
        baseSujeta: form.base.trim(),
        fechaEmision: form.fecha,
      });
      if (!result.ok) {
        const code = (result.error as { code: string }).code;
        const msg = (result.error as { message: string }).message;
        setMessage(`${code}: ${errorEs[code] ?? msg}`);
        setConfirmOpen(false);
      } else {
        router.push(`/c/${companyId}/retenciones-islr/${(result as { id: string }).id}`);
      }
    } finally {
      setBusy(null);
    }
  }

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setPreview(null);
  }

  return (
    <div className="grid gap-4">
      <Card className="rounded-lg">
        <CardHeader className="pb-3">
          <CardTitle className="text-base tracking-tight">Datos de la retención</CardTitle>
          <CardDescription>
            La comparación es informativa: no constituye aprobación fiscal ni agrega UT no registrada en la regla.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="settlementEventId" className={labelCls}>Evento de liquidación</label>
            <select
              id="settlementEventId"
              value={form.settlementEventId}
              onChange={(event) => set("settlementEventId", event.target.value)}
              className={inputCls}
            >
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.eventType === "payment" ? eventLabels.payment : eventLabels.account_credit} · {event.eventDate} · {event.rif} · {event.amount} {event.currency}
                </option>
              ))}
            </select>
            <p className={helpCls}>
              {selectedEvent?.allocated
                ? `Asignado ${fmtMonto(selectedEvent.allocated)} de ${fmtMonto(selectedEvent.amount)}. Sin asignación verificable no se emite.`
                : "Debe estar asignado a sus compras para emitirse."}
            </p>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="conceptId" className={labelCls}>Concepto de pago</label>
            <select
              id="conceptId"
              value={form.conceptId}
              onChange={(event) => set("conceptId", event.target.value)}
              className={inputCls}
            >
              {concepts.map((concept) => (
                <option key={concept.id} value={concept.id}>
                  {concept.codigo} — {concept.nombre}
                </option>
              ))}
            </select>
            <p className={helpCls}>Determina porcentaje, sustraendo y vigencia de la regla.</p>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="baseSujeta" className={labelCls}>Base sujeta</label>
            <input
              id="baseSujeta"
              value={form.base}
              onChange={(event) => set("base", event.target.value)}
              placeholder="1000.00"
              inputMode="decimal"
              autoComplete="off"
              className={inputCls}
              aria-describedby="base-help"
            />
            <p id="base-help" className={helpCls}>
              Se reutiliza en ambos escenarios para comparar; no atribuye base por porción ni decide sustraendo parcial.
            </p>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="fechaEmision" className={labelCls}>Fecha emisión</label>
            <input
              id="fechaEmision"
              type="date"
              value={form.fecha}
              onChange={(event) => set("fecha", event.target.value)}
              className={inputCls}
            />
          </div>
          <div className="sm:col-span-2">
            <Button
              type="button"
              variant="outline"
              onClick={doPreview}
              disabled={!form.settlementEventId || !form.conceptId || !baseOk || busy !== null}
            >
              <CompareArrows className="h-4 w-4" aria-hidden />
              {busy === "preview" ? "Comparando…" : "Comparar criterios"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {message && (
        <p role="alert" className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800">
          <WarningAmber className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {message}
        </p>
      )}

      {preview && (
        <Card className="overflow-hidden rounded-lg">
          <div
            className="h-1 bg-gradient-to-r from-[#120c27] via-[#352574] to-[#37c8a1]"
            aria-hidden
          />
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-base tracking-tight">Comparación dual</CardTitle>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">Criterio: {preview.criterion}</Badge>
                <Badge variant={preview.converged ? "success" : "warning"}>
                  {preview.converged ? "Convergen" : "Divergen"}
                </Badge>
              </div>
            </div>
            <CardDescription>
              ¿Convergen fecha, período, regla, base e importe?{" "}
              {preview.converged ? "Sí: emisión posible según criterio." : "No: bloqueado antes de reservar número."}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              <CandidateCard title="Escenario: solo pago" candidate={preview.paymentOnly} />
              <CandidateCard title="Escenario: abono o pago, el primero" candidate={preview.accountCreditOrPayment} />
            </div>
            {preview.explanation.length > 0 && (
              <ol className="list-decimal space-y-1 rounded-md bg-periwinkle-50 px-3 py-2.5 pl-8 text-xs text-periwinkle-700">
                {preview.explanation.map((step, index) => (
                  <li key={index}>{step}</li>
                ))}
              </ol>
            )}
            {preview.canIssue ? (
              <div className="flex flex-wrap items-center gap-3">
                <Button type="button" size="lg" onClick={() => setConfirmOpen(true)} disabled={busy !== null}>
                  <Lock className="h-4 w-4" aria-hidden />
                  Emitir · {fmtMonto(preview.retainedAmount)}
                </Button>
                <span className="text-xs text-periwinkle-500">
                  Reserva número de serie en la misma transacción; fórmula máx(0, base × % − sustraendo).
                </span>
              </div>
            ) : (
              <p role="alert" className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
                {preview.converged ? <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> : <Cancel className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />}
                {preview.blockReason ?? "No se puede emitir con el criterio actual."}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <Modal open={confirmOpen} onClose={() => (busy ? undefined : setConfirmOpen(false))} label="Confirmar emisión ISLR">
        <h2 className="text-base font-semibold tracking-tight">¿Emitir el comprobante?</h2>
        <p className="mt-2 text-sm text-periwinkle-500">
          Se reservará número de serie y el comprobante quedará{" "}
          <strong>emitido e inmutable</strong> con snapshot de regla y datos. Solo
          podrá anularse o sustituirse después.
        </p>
        {preview && (
          <dl className="mt-3 divide-y divide-periwinkle-100 rounded-md border border-periwinkle-100 px-3 text-sm">
            <div className="flex items-center justify-between gap-4 py-2">
              <dt className="text-periwinkle-500">Retención</dt>
              <dd className="font-mono font-bold">{fmtMonto(preview.retainedAmount)}</dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-2">
              <dt className="text-periwinkle-500">Base sujeta</dt>
              <dd className="font-mono">{fmtMonto(form.base)}</dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-2">
              <dt className="text-periwinkle-500">Fecha emisión</dt>
              <dd className="font-mono">{form.fecha}</dd>
            </div>
          </dl>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" disabled={busy !== null} onClick={() => setConfirmOpen(false)}>
            Cancelar
          </Button>
          <Button disabled={busy !== null} onClick={doIssue}>
            <Lock aria-hidden />
            {busy === "issue" ? "Emitiendo…" : "Sí, emitir"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
