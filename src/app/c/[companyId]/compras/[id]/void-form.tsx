"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { voidPurchaseAction } from "@/modules/fiscal-docs/actions";

export function VoidPurchaseForm({ companyId, id }: { companyId: string; id: string }) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!confirming) {
          setConfirming(true);
          return;
        }
        setBusy(true);
        setError(null);
        const res = await voidPurchaseAction(companyId, id, reason);
        setBusy(false);
        if (!res.ok) setError(`${res.error.code}: ${res.error.message}`);
        else router.refresh();
      }}
      className="flex flex-col gap-2"
    >
      <label
        htmlFor="motivo-anulacion-compra"
        className="text-xs font-semibold uppercase tracking-wider text-periwinkle-500"
      >
        Motivo de anulación
      </label>
      <input
        id="motivo-anulacion-compra"
        value={reason}
        onChange={(e) => {
          setReason(e.target.value);
          setConfirming(false);
        }}
        placeholder="p. ej. tipo incorrecto: era NC, se registró ND"
        className="h-9 w-full rounded-md border border-periwinkle-300 bg-white px-3 py-1.5 text-sm outline-none transition-colors placeholder:text-periwinkle-400 focus-visible:border-[#37c8a1] focus-visible:ring-2 focus-visible:ring-[#37c8a1]/30"
      />
      <div>
        <button
          type="submit"
          disabled={busy || reason.trim().length < 3}
          className="inline-flex h-9 items-center rounded-md border border-red-300 bg-white px-5 text-sm font-medium text-red-800 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {confirming ? "Confirmar anulación (no libera número)" : "Anular documento"}
        </button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
    </form>
  );
}
