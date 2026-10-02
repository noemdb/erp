"use client";

import { useState } from "react";
import Download from "@mui/icons-material/Download";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

const TEMPLATES = [
  {
    kind: "purchases",
    label: "Compras",
    columns: "fecha, rif, razon_social, factura, control, base_imponible, iva, total",
  },
  {
    kind: "sales",
    label: "Ventas",
    columns: "fecha, rif, razon_social, factura, control, base_imponible, iva, total",
  },
  {
    kind: "z_reports",
    label: "Reportes Z",
    columns: "fecha, z, maquina, primera, ultima, gravadas, exentas, iva, total",
  },
];

export function TemplateDialog({ companyId }: { companyId: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Download aria-hidden />
        Plantilla CSV
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        label="Descargar plantilla CSV"
      >
        <h2 className="text-base font-semibold tracking-tight">
          Plantilla CSV
        </h2>
        <p className="mt-1 text-sm text-periwinkle-500">
          Columnas exactas que espera el validador, con una fila de ejemplo.
          Fechas DD/MM/AAAA o AAAA-MM-DD; decimales con punto o coma.
        </p>
        <ul className="mt-4 space-y-2">
          {TEMPLATES.map((t) => (
            <li
              key={t.kind}
              className="flex items-center justify-between gap-3 rounded-md border border-periwinkle-100 px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium">{t.label}</p>
                <p className="truncate font-mono text-xs text-periwinkle-500" title={t.columns}>
                  {t.columns}
                </p>
              </div>
              <a
                href={`/api/companies/${companyId}/imports/template?kind=${t.kind}`}
                download
                className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-periwinkle-300 bg-white px-3 text-sm font-medium text-[#120c27] transition-colors hover:bg-periwinkle-50 h-9"
              >
                <Download className="h-4 w-4" aria-hidden />
                Descargar
              </a>
            </li>
          ))}
        </ul>
      </Modal>
    </>
  );
}
