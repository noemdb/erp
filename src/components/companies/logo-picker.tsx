"use client";

import { useCallback, useRef, useState } from "react";
import CloudUpload from "@mui/icons-material/CloudUpload";
import { useUploadThing } from "@/lib/uploadthing";
import { cn } from "@/lib/utils";

const MAX_BYTES = 1024 * 1024; // 1 MB

export function LogoPicker({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (url: string) => void;
  disabled?: boolean;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { startUpload, isUploading } = useUploadThing("companyLogo", {
    onClientUploadComplete: (res) => {
      const url = res?.[0]?.ufsUrl;
      if (url) {
        onChange(url);
        setError(null);
      } else {
        setError("No se recibió la URL del logo. Intenta de nuevo.");
      }
    },
    onUploadError: (e) => {
      setError(`No se pudo subir el logo: ${e.message}`);
    },
  });

  const shown = preview ?? (value || null);
  const busy = disabled || isUploading;

  const pick = useCallback(
    (file: File) => {
      // La vista previa se muestra SIEMPRE, antes de validar.
      setPreview((old) => {
        if (old) URL.revokeObjectURL(old);
        return URL.createObjectURL(file);
      });
      if (!file.type.startsWith("image/")) {
        setError("El archivo debe ser una imagen.");
        return;
      }
      if (file.size > MAX_BYTES) {
        setError(`El logo no puede pasar de 1 MB (pesan ${(file.size / 1024 / 1024).toFixed(1)} MB).`);
        return;
      }
      setError(null);
      void startUpload([file]);
    },
    [startUpload]
  );

  const label = shown
    ? preview
      ? "Vista previa"
      : "Logo actual"
    : "Logo PNG";
  const hint = shown
    ? preview
      ? "Imagen · fondo transparente (PNG recomendado) · máx 1 MB"
      : "Logo guardado en la empresa"
    : "PNG recomendado (fondo transparente) · máx 1 MB";

  return (
    <div className="space-y-2">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!busy) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (busy) return;
          const file = e.dataTransfer.files[0];
          if (file) pick(file);
        }}
        onClick={(e) => {
          // Clic en cualquier zona (excepto "Quitar") abre el selector.
          if (busy) return;
          const t = e.target as HTMLElement;
          if (t === inputRef.current || t.closest("button[data-noopen]")) return;
          inputRef.current?.click();
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-md border-2 border-dashed px-6 py-6 text-center transition-colors",
          dragging
            ? "border-[#37c8a1] bg-icy-aqua-50"
            : "border-periwinkle-300 bg-periwinkle-50/40",
          busy && "cursor-not-allowed opacity-70"
        )}
      >
        {shown ? (
          <div
            className={cn(
              "flex w-full items-center gap-4",
              isUploading && "opacity-70"
            )}
          >
            <img
              src={shown}
              alt="Vista previa del logo"
              className="h-20 w-20 shrink-0 rounded-md border border-periwinkle-200 bg-white object-contain p-1.5 shadow-sm"
            />
            <div className="min-w-0 flex-1 text-left">
              <p className="text-sm font-medium text-periwinkle-900">{label}</p>
              <p className="truncate text-xs text-periwinkle-500">{hint}</p>
              {isUploading && (
                <p
                  className="mt-1 text-xs font-medium text-[#352574]"
                  role="status"
                >
                  Subiendo logo…
                </p>
              )}
            </div>
          </div>
        ) : (
          <CloudUpload className="h-9 w-9 text-periwinkle-400" aria-hidden />
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          disabled={busy}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) pick(file);
            e.target.value = "";
          }}
        />
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            disabled={busy}
            className="rounded-md bg-[#120c27] px-4 py-2 text-sm font-medium text-white shadow-md transition-colors hover:bg-[#352574] disabled:opacity-50"
          >
            {isUploading ? "Subiendo…" : shown ? "Reemplazar logo" : "Elegir logo"}
          </button>
          {shown && (
            <button
              type="button"
              data-noopen
              disabled={busy}
              onClick={(e) => {
                e.stopPropagation();
                setPreview((old) => {
                  if (old) URL.revokeObjectURL(old);
                  return null;
                });
                onChange("");
              }}
              className="rounded-md border border-periwinkle-200 bg-white px-3 py-2 text-sm font-medium text-periwinkle-600 transition-colors hover:bg-periwinkle-100 hover:text-[#120c27] disabled:opacity-50"
            >
              Quitar
            </button>
          )}
        </div>
        <p className="text-xs text-periwinkle-400">
          Arrastra la imagen aquí o haz clic en cualquier parte para elegirla
        </p>
      </div>
      {error && (
        <p role="alert" className="text-xs font-medium text-red-800">
          {error}
        </p>
      )}
    </div>
  );
}
