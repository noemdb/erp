"use client";

import { useState } from "react";
import Add from "@mui/icons-material/Add";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { ProfileForm } from "./profile-form";

export function ProfileDialog({
  companyId,
  partyId,
}: {
  companyId: string;
  partyId: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Add aria-hidden />
        Nuevo perfil
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        label="Nuevo perfil fiscal"
      >
        <h2 className="text-base font-semibold tracking-tight">
          Nuevo perfil fiscal
        </h2>
        <p className="mt-1 text-sm text-periwinkle-500">
          Cierra la vigencia anterior y abre la nueva.
        </p>
        <div className="mt-4">
          <ProfileForm
            companyId={companyId}
            partyId={partyId}
            onDone={() => setOpen(false)}
          />
        </div>
      </Modal>
    </>
  );
}
