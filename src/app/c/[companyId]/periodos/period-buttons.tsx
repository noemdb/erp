"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Lock from "@mui/icons-material/Lock";
import LockOpen from "@mui/icons-material/LockOpen";
import RateReview from "@mui/icons-material/RateReview";
import Undo from "@mui/icons-material/Undo";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import {
  sendToReviewAction,
  returnToOpenAction,
  closePeriodAction,
  reopenPeriodAction,
} from "@/modules/periods/actions";

type ActionResult = { ok: boolean; error?: unknown };

const errorEs: Record<string, string> = {
  FORBIDDEN: "Solo el contador puede ejecutar esta acción.",
  VALIDATION_ERROR: "El motivo es obligatorio (mínimo 3 caracteres).",
  INVALID_STATE_TRANSITION: "Esa transición no está permitida desde este estado.",
  CHECKLIST_BLOCKED: "El cierre está bloqueado por el checklist.",
  NOT_FOUND: "El período ya no existe.",
  PERIOD_CLOSED: "El período está cerrado y no admite cambios.",
};

function toMessage(error: unknown): string {
  const e = error as { code?: string; message?: string } | undefined;
  if (!e?.code) return "Ocurrió un error. Inténtalo de nuevo.";
  const code = e.code;
  const friendly = errorEs[code] ?? "Ocurrió un error. Inténtalo de nuevo.";
  // CHECKLIST_BLOCKED trae el detalle útil del servidor: conservarlo.
  if (code === "CHECKLIST_BLOCKED" && e.message) return `${friendly} ${e.message}`;
  return friendly;
}

export function PeriodButtons({
  companyId,
  periodId,
  status,
  canManage,
}: {
  companyId: string;
  periodId: string;
  status: string;
  canManage: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<"devolver" | "reabrir" | "cerrar" | null>(
    null,
  );
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState<string | null>(null);

  async function run(key: string, p: Promise<ActionResult>) {
    setBusy(key);
    setError(null);
    try {
      const r = await p;
      if (!r.ok) {
        setError(toMessage((r as { error?: unknown }).error));
      } else {
        setModal(null);
        setReason("");
        router.refresh();
      }
    } finally {
      setBusy(null);
    }
  }

  function submitWithReason(kind: "devolver" | "reabrir") {
    const v = reason.trim();
    if (v.length < 3) {
      setReasonError("Escribe un motivo de al menos 3 caracteres.");
      return;
    }
    setReasonError(null);
    if (kind === "devolver")
      void run("devolver", returnToOpenAction(companyId, periodId, v));
    else void run("reabrir", reopenPeriodAction(companyId, periodId, v));
  }

  if (!canManage) return null;

  const loading = busy !== null;

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {status === "open" && (
          <Button
            disabled={loading}
            onClick={() =>
              void run("revisar", sendToReviewAction(companyId, periodId))
            }
          >
            <RateReview aria-hidden />
            {busy === "revisar" ? "Enviando…" : "Enviar a revisión"}
          </Button>
        )}
        {status === "under_review" && (
          <>
            <Button
              disabled={loading}
              onClick={() => {
                setError(null);
                setModal("cerrar");
              }}
            >
              <Lock aria-hidden />
              Cerrar período
            </Button>
            <Button
              variant="outline"
              disabled={loading}
              onClick={() => {
                setError(null);
                setReasonError(null);
                setModal("devolver");
              }}
            >
              <Undo aria-hidden />
              Devolver a abierto
            </Button>
          </>
        )}
        {status === "closed" && (
          <Button
            variant="outline"
            disabled={loading}
            onClick={() => {
              setError(null);
              setReasonError(null);
              setModal("reabrir");
            }}
          >
            <LockOpen aria-hidden />
            Reabrir con motivo
          </Button>
        )}
        {status === "reopened" && (
          <>
            <Button
              variant="outline"
              disabled={loading}
              onClick={() =>
                void run("revisar", sendToReviewAction(companyId, periodId))
              }
            >
              <RateReview aria-hidden />
              {busy === "revisar" ? "Enviando…" : "Enviar a revisión"}
            </Button>
            <Button
              disabled={loading}
              onClick={() => {
                setError(null);
                setModal("cerrar");
              }}
            >
              <Lock aria-hidden />
              Volver a cerrar
            </Button>
          </>
        )}
      </div>

      <p className="mt-2 text-xs text-periwinkle-500">
        Cerrar congela libros y comprobantes con hash. Reabrir y devolver
        exigen motivo auditado.
      </p>

      {error && (
        <p
          role="alert"
          className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800"
        >
          {error}
        </p>
      )}

      {/* Confirmar cierre */}
      <Modal
        open={modal === "cerrar"}
        onClose={() => (loading ? undefined : setModal(null))}
        label="Confirmar cierre del período"
      >
        <h2 className="text-base font-semibold tracking-tight">
          ¿Cerrar el período?
        </h2>
        <p className="mt-2 text-sm text-periwinkle-500">
          Se verifica el checklist bloqueante y se calcula el hash de cierre.
          Después del cierre no podrás editar documentos hasta reabrir con
          motivo.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button
            variant="outline"
            disabled={loading}
            onClick={() => setModal(null)}
          >
            Cancelar
          </Button>
          <Button
            disabled={loading}
            onClick={() =>
              void run("cerrar", closePeriodAction(companyId, periodId))
            }
          >
            <Lock aria-hidden />
            {busy === "cerrar" ? "Cerrando…" : "Sí, cerrar"}
          </Button>
        </div>
      </Modal>

      {/* Motivo devolver / reabrir */}
      <Modal
        open={modal === "devolver" || modal === "reabrir"}
        onClose={() => (loading ? undefined : setModal(null))}
        label={
          modal === "devolver" ? "Devolver a abierto" : "Reabrir período"
        }
      >
        <h2 className="text-base font-semibold tracking-tight">
          {modal === "devolver" ? "Devolver a abierto" : "Reabrir período"}
        </h2>
        <p className="mt-2 text-sm text-periwinkle-500">
          {modal === "devolver"
            ? "Explica qué debe corregirse antes del cierre. Quedará en bitácora."
            : "Explica por qué se reabre un período cerrado: responsable, alcance y documentos afectados. Quedará en bitácora."}
        </p>
        <label
          htmlFor="period-reason"
          className="mt-4 block text-sm font-medium"
        >
          Motivo (obligatorio)
        </label>
        <textarea
          id="period-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={
            modal === "devolver"
              ? "Ej.: faltan 3 facturas de compra por registrar"
              : "Ej.: NC de septiembre registrada en octubre, se corrige saldo"
          }
          rows={3}
          maxLength={500}
          disabled={loading}
          aria-invalid={reasonError ? true : undefined}
          className="mt-1.5 w-full rounded-md border border-periwinkle-300 bg-white px-3 py-2 text-sm outline-none transition-colors placeholder:text-periwinkle-300 focus:border-[#352574] focus:ring-2 focus:ring-[#37c8a1]/40 disabled:opacity-50"
        />
        {reasonError ? (
          <p role="alert" className="mt-1.5 text-xs text-red-700">
            {reasonError}
          </p>
        ) : (
          <p className="mt-1.5 text-xs text-periwinkle-500">
            Mínimo 3 caracteres, máximo 500.
          </p>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <Button
            variant="outline"
            disabled={loading}
            onClick={() => setModal(null)}
          >
            Cancelar
          </Button>
          <Button
            disabled={loading}
            onClick={() =>
              submitWithReason(modal === "devolver" ? "devolver" : "reabrir")
            }
          >
            {busy === "devolver" || busy === "reabrir"
              ? "Guardando…"
              : modal === "devolver"
                ? "Devolver"
                : "Reabrir"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
