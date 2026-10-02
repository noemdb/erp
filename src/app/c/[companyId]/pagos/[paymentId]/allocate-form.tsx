"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import WarningAmber from "@mui/icons-material/WarningAmber";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { allocateSettlementEventAction } from "@/modules/payments/actions";

const errorEs: Record<string, string> = {
  VALIDATION_ERROR: "Revisa el monto y la compra elegida.",
  NOT_FOUND: "El evento o la compra ya no están disponibles.",
  G2_EVENT_REVIEW_REQUIRED: "Hay una retención ISLR emitida en fecha igual o posterior: no se puede asignar sin revisión.",
};

export type PurchaseOption = { id: string; docNumber: string; total: string; status: string; partyId: string };

const inputCls =
  "flex h-10 w-full rounded-md border border-periwinkle-300 bg-white px-3 py-2 text-sm text-periwinkle-900 shadow-sm transition-colors outline-none placeholder:text-periwinkle-400 focus-visible:border-[#37c8a1] focus-visible:ring-2 focus-visible:ring-[#37c8a1]/30 disabled:cursor-not-allowed disabled:opacity-50";
const labelCls = "text-sm font-medium text-periwinkle-700";
const helpCls = "text-xs text-periwinkle-400";

export function AllocateForm({
  companyId,
  eventId,
  eventPartyId,
  available,
  purchases,
}: {
  companyId: string;
  eventId: string;
  eventPartyId: string;
  available: string;
  purchases: PurchaseOption[];
}) {
  const router = useRouter();
  const [purchaseId, setPurchaseId] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const sameParty = useMemo(
    () => purchases.filter((p) => p.partyId === eventPartyId),
    [purchases, eventPartyId],
  );
  const others = purchases.length - sameParty.length;
  const selected = sameParty.find((p) => p.id === purchaseId);
  const selectable = sameParty.filter((p) => p.status === "validated");

  const amountOk = useMemo(() => {
    const n = Number(amount);
    if (amount.trim() === "" || !Number.isFinite(n) || n <= 0) return false;
    if (!/^\d+(\.\d{1,2})?$/.test(amount.trim())) return false;
    return n <= Number(available);
  }, [amount, available]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!purchaseId) {
      setError("VALIDATION_ERROR: elige la compra a la que se asigna.");
      return;
    }
    if (selected && selected.status !== "validated") {
      setError("NOT_FOUND: solo se puede asignar a compras validadas.");
      return;
    }
    if (!amountOk) {
      setError(`VALIDATION_ERROR: el monto debe ser mayor a 0, con 2 decimales y sin exceder el disponible (${available}).`);
      return;
    }
    setBusy(true);
    const res = await allocateSettlementEventAction(companyId, eventId, purchaseId, amount.trim());
    if (!res.ok) {
      const code = (res.error as { code: string }).code;
      const msg = (res.error as { message: string }).message;
      setError(`${code}: ${errorEs[code] ?? msg}`);
      setBusy(false);
    } else {
      setAmount("");
      router.refresh();
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-1.5">
        <label htmlFor="purchaseDocumentId" className={labelCls}>Compra del mismo proveedor</label>
        <select
          id="purchaseDocumentId"
          value={purchaseId}
          onChange={(e) => setPurchaseId(e.target.value)}
          className={inputCls}
          aria-describedby="purchase-help"
        >
          <option value="">Selecciona la compra…</option>
          {selectable.map((p) => (
            <option key={p.id} value={p.id}>
              {p.docNumber} · total {p.total}
            </option>
          ))}
        </select>
        <p id="purchase-help" className={helpCls}>
          {sameParty.length === 0
            ? "No hay compras de este proveedor todavía."
            : `${selectable.length} validada(s) asignables${others > 0 ? `; ${others} de otro proveedor ocultas` : ""}. Solo validadas.`}
        </p>
      </div>
      <div className="space-y-1.5">
        <label htmlFor="allocateAmount" className={labelCls}>Monto asignado</label>
        <input
          id="allocateAmount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
          placeholder={`máx. ${available}`}
          inputMode="decimal"
          autoComplete="off"
          className={inputCls}
        />
        <p className={helpCls}>Disponible del evento: {available}. No emite retención.</p>
      </div>
      {error && (
        <p role="alert" className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800 sm:col-span-2">
          <WarningAmber className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {error}
        </p>
      )}
      <div className={cn("sm:col-span-2")}>
        <Button type="submit" disabled={busy || !purchaseId || !amountOk}>
          {busy ? "Asignando…" : "Asignar a compra"}
        </Button>
      </div>
    </form>
  );
}
