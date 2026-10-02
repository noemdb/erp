"use client";

import { useState, type ReactNode } from "react";
import AccountTree from "@mui/icons-material/AccountTree";
import Close from "@mui/icons-material/Close";
import Info from "@mui/icons-material/Info";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/utils";

type Flow = {
  id: string;
  process: string;
  subtitle: string;
  footer: ReactNode;
};

export type FlowProcess =
  | "compras"
  | "ventas"
  | "pagos"
  | "iva"
  | "islr"
  | "recibidas";

const FLOWS: Record<FlowProcess, Flow> = {
  compras: {
    id: "compras",
    process: "Compras",
    subtitle: "Del documento del proveedor al Libro de Compras",
    footer: (
      <>
        Si el mes ya está cerrado no se puede editar: pídele al contador la
        reapertura. Si un número no cuadra o el documento ya existe, el sistema
        te avisa y nada se guarda a medias.
      </>
    ),
  },
  ventas: {
    id: "ventas",
    process: "Ventas",
    subtitle: "De tus ventas al Libro de Ventas",
    footer: (
      <>
        Si un cliente te retiene, anota su comprobante en Retenciones
        recibidas para que aparezca a tu favor en el resumen.
      </>
    ),
  },
  pagos: {
    id: "pagos",
    process: "Pagos",
    subtitle: "De tu pago al comprobante",
    footer: (
      <>
        Anotar el pago no genera la retención sola: se emite aparte tomando tu
        pago o abono como base.
      </>
    ),
  },
  iva: {
    id: "iva",
    process: "Retenciones IVA",
    subtitle: "De tus facturas al comprobante",
    footer: (
      <>
        Un comprobante puede cubrir varias facturas del mismo proveedor.
        Emitido no se edita: se anula con motivo y se emite el sustituto.
      </>
    ),
  },
  islr: {
    id: "islr",
    process: "Retenciones ISLR",
    subtitle: "De tu pago al comprobante por concepto",
    footer: (
      <>
        El concepto (honorarios, alquileres…) define cuánto se retiene.
        Nace de tu pago o abono, lo que ocurra primero.
      </>
    ),
  },
  recibidas: {
    id: "recibidas",
    process: "Retenciones recibidas",
    subtitle: "Lo que te retuvieron, a tu favor",
    footer: (
      <>
        Anota lo que te retuvieron tus clientes y vincúlalo a tus ventas:
        aparece a tu favor en el resumen.
      </>
    ),
  },
};

export function FlowButton({ process }: { process: FlowProcess }) {
  const [open, setOpen] = useState(false);
  const flow = FLOWS[process];
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md border border-periwinkle-200 px-3.5 py-1.5 my-1",
          "text-xs font-medium text-periwinkle-500 transition-colors",
          "hover:border-[#37c8a1] hover:text-[#120c27]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#37c8a1]"
        )}
      >
        <AccountTree className="h-3.5 w-3.5" aria-hidden />
        Ver flujo
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        label={`Diagrama de flujo: ${flow.process}`}
        dialogClassName="animate-fade-up relative h-[90vh] w-[90vw] overflow-y-auto rounded-md border border-periwinkle-200 bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-periwinkle-400">
              <AccountTree className="h-4 w-4" aria-hidden /> Diagrama de flujo
            </p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-[#120c27]">{flow.process}</h2>
            <p className="mt-0.5 text-sm text-periwinkle-500">{flow.subtitle}</p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Cerrar diagrama"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-periwinkle-400 transition-colors hover:bg-periwinkle-100 hover:text-[#120c27] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#37c8a1]"
          >
            <Close className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <iframe
          src={`/docs/flujos/${flow.id}.html`}
          title={`Diagrama interactivo: ${flow.process}`}
          className="mt-4 h-[68vh] w-full rounded-md border border-periwinkle-200 bg-white"
          loading="lazy"
        />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-periwinkle-500">
            Diagrama interactivo: elige un flujo y avanza paso a paso con los
            controles del lienzo.{" "}
            <a
              href={`/docs/flujos/${flow.id}.html`}
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-[#352574] hover:underline"
            >
              Abrir en pestaña nueva →
            </a>
          </p>
        </div>
        <div className="mt-3 flex gap-2 rounded-md border border-periwinkle-200 bg-periwinkle-100/50 px-4 py-3 text-sm text-periwinkle-700">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#352574]" aria-hidden />
          <p>{flow.footer}</p>
        </div>
      </Modal>
    </>
  );
}
