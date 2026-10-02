"use client";

import { useState } from "react";
import Add from "@mui/icons-material/Add";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { CreatePeriodForm } from "./create-period-form";

export function CreatePeriodDialog({
  companyId,
  defaultKind,
}: {
  companyId: string;
  defaultKind: "monthly" | "biweekly";
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Add aria-hidden />
        Registrar período
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        label="Registrar período fiscal"
      >
        <h2 className="text-base font-semibold tracking-tight">
          Registrar período
        </h2>
        <p className="mt-1 text-sm text-periwinkle-500">
          Crea el período antes de registrar documentos. Si ya existe, se
          reutiliza sin duplicar.
        </p>
        <div className="mt-4">
          <CreatePeriodForm
            companyId={companyId}
            defaultKind={defaultKind}
            onDone={() => setOpen(false)}
          />
        </div>
      </Modal>
    </>
  );
}
