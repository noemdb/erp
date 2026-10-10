"use client";

import { useEffect, useState } from "react";
import Storage from "@mui/icons-material/Storage";
import Download from "@mui/icons-material/Download";
import Upload from "@mui/icons-material/Upload";
import DeleteForever from "@mui/icons-material/DeleteForever";
import WarningAmber from "@mui/icons-material/WarningAmber";
import ContentCopy from "@mui/icons-material/ContentCopy";
import FactCheck from "@mui/icons-material/FactCheck";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/progress";
import { cleanDatabaseAction, previewCleanAction, listCleanCompaniesAction } from "@/modules/maintenance/actions";

const inputClassName =
  "flex h-10 w-full rounded-md border border-periwinkle-300 bg-white px-3 py-2 text-sm text-periwinkle-900 shadow-sm transition-colors outline-none placeholder:text-periwinkle-400 focus-visible:border-[#37c8a1] focus-visible:ring-2 focus-visible:ring-[#37c8a1]/30 disabled:cursor-not-allowed disabled:opacity-50";

function Msg({ text, ok }: { text: string; ok: boolean }) {
  return (
    <p
      role={ok ? "status" : "alert"}
      className={
        ok
          ? "rounded-md border border-icy-aqua-600/30 bg-icy-aqua-50 px-3 py-2.5 text-sm text-icy-aqua-700"
          : "flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800"
      }
    >
      {!ok && <WarningAmber className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />}
      {text}
    </p>
  );
}

export function StatusCard() {
  const [data, setData] = useState<{
    status: { sizeBytes: number; companies: number; users: number; comprobantes: number; documentos: number };
    history: { ts: string; action: string; bytes?: number; sha256?: string }[];
  } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/database/status")
      .then(async (r) => {
        const body = (await r.json().catch(() => null)) as { data?: never; error?: { code?: string; message?: string } } | null;
        if (!r.ok) setErr(`${body?.error?.code ?? "ERROR"}: ${body?.error?.message ?? "Sin estado."}`);
        else setData(body?.data as never);
      })
      .catch(() => setErr("Error de red."));
  }, []);

  const fmtBytes = (n: number) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
  const fmtTs = (iso: string) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(iso);
    return m ? `${m[3]}-${m[2]}-${m[1]} ${m[4]}:${m[5]}` : iso;
  };
  const last = (action: string) => data?.history.find((h) => h.action === action);

  return (
    <Card className="overflow-hidden rounded-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-periwinkle-100 text-[#120c27]">
            <Storage className="h-4 w-4" aria-hidden />
          </span>
          <div>
            <CardTitle className="text-base tracking-tight">Estado de la base de datos</CardTitle>
            <CardDescription>Tamaño, contenido e historial reciente de mantenimientos.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {err && <Msg text={err} ok={false} />}
        {!err && !data && (
          <p className="text-sm text-periwinkle-500">Cargando estado…</p>
        )}
        {data && (
          <div className="space-y-2 text-sm" role="status">
            <p>
              Tamaño <strong>{fmtBytes(data.status.sizeBytes)}</strong> · {data.status.companies} empresa(s) ·{" "}
              {data.status.users} usuario(s) · {data.status.documentos} documento(s) · {data.status.comprobantes} comprobante(s).
            </p>
            <ul className="list-disc space-y-0.5 pl-5 text-periwinkle-700">
              <li>Último backup: {last("backup") ? `${fmtTs(last("backup")!.ts)} (${last("backup")!.bytes ? fmtBytes(last("backup")!.bytes!) : "—"})` : "nunca"}</li>
              <li>Último restore: {last("restore") ? fmtTs(last("restore")!.ts) : "nunca"}</li>
              <li>Última limpieza: {last("clean") ? fmtTs(last("clean")!.ts) : "nunca"}</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function BackupCard() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [proof, setProof] = useState<{ sha: string; kb: string; tablas: string; completa: boolean } | null>(null);
  const [copied, setCopied] = useState(false);

  async function copySha() {
    if (!proof) return;
    try {
      await navigator.clipboard.writeText(proof.sha);
      setCopied(true);
    } catch {
      /* selección manual */
    }
  }

  async function download() {
    setBusy(true);
    setMsg(null);
    setProof(null);
    setCopied(false);
    try {
      const res = await fetch("/api/admin/database/backup");
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: { code?: string; message?: string } } | null;
        setMsg({ text: `${body?.error?.code ?? "ERROR"}: ${body?.error?.message ?? "No se pudo generar el backup."}`, ok: false });
        return;
      }
      const blob = await res.blob();
      const name = res.headers.get("Content-Disposition")?.match(/filename=([^;]+)/)?.[1] ?? "erp-backup.sql";
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = name;
      a.click();
      URL.revokeObjectURL(a.href);
      setProof({
        sha: res.headers.get("X-Backup-Sha256") ?? "—",
        kb: (blob.size / 1024).toFixed(0),
        tablas: res.headers.get("X-Backup-Tables") ?? "—",
        completa: res.headers.get("X-Backup-Complete") === "1",
      });
      setMsg({ text: `Copia descargada (${(blob.size / 1024).toFixed(0)} KB). Guárdala fuera del servidor.`, ok: true });
    } catch {
      setMsg({ text: "Error de red. Intenta de nuevo.", ok: false });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="overflow-hidden rounded-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-periwinkle-100 text-[#120c27]">
            <Download className="h-4 w-4" aria-hidden />
          </span>
          <div>
            <CardTitle className="text-base tracking-tight">Descargar base de datos (backup)</CardTitle>
            <CardDescription>Archivo .sql completo, listo para restaurar con psql o desde aquí.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button type="button" onClick={download} disabled={busy}>
          {busy ? (
            <>
              <Spinner label="Generando backup" />
              Generando…
            </>
          ) : (
            "Descargar backup .sql"
          )}
        </Button>
        {msg && <Msg text={msg.text} ok={msg.ok} />}
        {proof && (
          <div className="space-y-1.5 rounded-md border border-icy-aqua-600/30 bg-icy-aqua-50 px-3 py-2.5 text-sm" role="status">
            <p className="font-medium text-icy-aqua-700">
              Verificado: {proof.tablas} tablas · {proof.kb} KB · dump {proof.completa ? "completo" : "revisar marca final"}.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input readOnly value={proof.sha} onFocus={(e) => e.target.select()} aria-label="sha256 de la copia" className={`${inputClassName} font-mono text-xs`} />
              <Button type="button" variant="secondary" onClick={copySha} className="shrink-0">
                <ContentCopy aria-hidden />
                {copied ? "¡Copiado!" : "Copiar"}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function RestoreCard() {
  const [file, setFile] = useState<File | null>(null);
  const [confirm, setConfirm] = useState("");
  const [backupDone, setBackupDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setBusy(true);
    setMsg(null);
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("confirm", confirm.trim());
      form.set("backupDone", backupDone ? "true" : "false");
      const res = await fetch("/api/admin/database/restore", { method: "POST", body: form });
      const body = (await res.json().catch(() => null)) as { data?: { safety?: string }; error?: { code?: string; message?: string } } | null;
      if (!res.ok) setMsg({ text: `${body?.error?.code ?? "ERROR"}: ${body?.error?.message ?? "No se pudo restaurar."}`, ok: false });
      else {
        setMsg({
          text: `Restore aplicado. Copia previa guardada en el servidor (${body?.data?.safety ?? "ver storage/.safety"}). Corre la verificación antes de operar.`,
          ok: true,
        });
        setFile(null);
        setConfirm("");
        setBackupDone(false);
      }
    } catch {
      setMsg({ text: "Error de red. Intenta de nuevo.", ok: false });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="overflow-hidden rounded-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-periwinkle-100 text-[#120c27]">
            <Upload className="h-4 w-4" aria-hidden />
          </span>
          <div>
            <CardTitle className="text-base tracking-tight">Restaurar base de datos (restore)</CardTitle>
            <CardDescription>Reemplaza TODA la base con el .sql. Todo o nada: si falla, no se aplica.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label htmlFor="restore-file" className="mb-1 block text-sm font-medium">
              Archivo .sql (máx. 100 MB)
            </label>
            <input
              id="restore-file"
              type="file"
              accept=".sql"
              required
              disabled={busy}
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-periwinkle-700 file:mr-3 file:rounded-md file:border-0 file:bg-periwinkle-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-[#120c27] hover:file:bg-periwinkle-200"
            />
          </div>
          <div>
            <label htmlFor="restore-confirm" className="mb-1 block text-sm font-medium">
              Escribe RESTAURAR para confirmar
            </label>
            <input
              id="restore-confirm"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="RESTAURAR"
              required
              disabled={busy}
              autoComplete="off"
              className={inputClassName}
            />
          </div>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" checked={backupDone} onChange={(e) => setBackupDone(e.target.checked)} disabled={busy} className="mt-1" />
            Ya descargué una copia de seguridad actual antes de restaurar.
          </label>
          <Button type="submit" disabled={busy || !file} variant="secondary">
            {busy ? (
              <>
                <Spinner label="Restaurando" />
                Restaurando…
              </>
            ) : (
              "Restaurar"
            )}
          </Button>
          {msg && <Msg text={msg.text} ok={msg.ok} />}
        </form>
        <div className="mt-3 border-t border-periwinkle-100 pt-3">
          <RestoreCheck />
        </div>
      </CardContent>
    </Card>
  );
}

type CheckData = {
  companies: { id: string; rif: string; comprobantesIva: number; comprobantesIslr: number; series: { prefix: string; estado: string }[] }[];
  ultimoCierre: { periodoId: string; hash: string; cerradaEn: string | null } | null;
};

function RestoreCheck() {
  const [busy, setBusy] = useState(false);
  const [data, setData] = useState<CheckData | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/database/restore-check");
      const body = (await res.json().catch(() => null)) as { data?: CheckData; error?: { code?: string; message?: string } } | null;
      if (!res.ok) setErr(`${body?.error?.code ?? "ERROR"}: ${body?.error?.message ?? "No se pudo verificar."}`);
      else setData(body?.data ?? null);
    } catch {
      setErr("Error de red. Intenta de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button type="button" variant="outline" disabled={busy} onClick={run}>
        {busy ? (
          <>
            <Spinner label="Verificando" />
            Verificando…
          </>
        ) : (
          <>
            <FactCheck aria-hidden />
            Verificar después de restaurar
          </>
        )}
      </Button>
      {err && <Msg text={err} ok={false} />}
      {data && (
        <div className="rounded-md border border-periwinkle-200 px-3 py-2.5 text-sm" role="status">
          <p>
            {data.companies.length} empresa(s) · último cierre:{" "}
            {data.ultimoCierre ? `${data.ultimoCierre.hash} (${data.ultimoCierre.cerradaEn ?? "sin fecha"})` : "ninguno"}.
          </p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-periwinkle-700">
            {data.companies.slice(0, 10).map((c) => (
              <li key={c.id}>
                {c.rif}: {c.comprobantesIva} IVA + {c.comprobantesIslr} ISLR
                {c.series.length > 0 ? ` · series: ${c.series.slice(0, 4).map((s) => `${s.prefix}→${s.estado}`).join(", ")}` : " · sin series"}
              </li>
            ))}
          </ul>
          {data.companies.length === 0 && <p>No hay empresas: la base quedó vacía.</p>}
        </div>
      )}
    </div>
  );
}

type Preview = {
  companyId?: string;
  tables: { tabla: string; filas: number }[];
  totalFilas: number;
  preservedUsers: number;
  usuariosAEliminar: number;
};

export function CleanCard() {
  const [confirm, setConfirm] = useState("");
  const [reason, setReason] = useState("");
  const [scope, setScope] = useState("");
  const [companies, setCompanies] = useState<{ id: string; rif: string; razonSocial: string }[]>([]);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  useEffect(() => {
    listCleanCompaniesAction().then((r) => {
      if (r.ok) setCompanies(r.companies);
    });
  }, []);

  async function runPreview() {
    setPreviewBusy(true);
    setMsg(null);
    try {
      const res = await previewCleanAction(scope === "" ? {} : { companyId: scope });
      if (!res.ok) setMsg({ text: `${res.error.code}: ${res.error.message}`, ok: false });
      else setPreview(res.preview);
    } catch {
      setMsg({ text: "Error de red. Intenta de nuevo.", ok: false });
    } finally {
      setPreviewBusy(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await cleanDatabaseAction(
        scope === "" ? { confirm: confirm.trim(), reason: reason.trim() } : { confirm: confirm.trim(), reason: reason.trim(), companyId: scope },
      );
      if (!res.ok) setMsg({ text: `${res.error.code}: ${res.error.message}`, ok: false });
      else {
        setMsg({
          text:
            scope === ""
              ? `Limpieza completa: ${res.counts.companies} empresas, ${res.counts.users} usuarios y ${res.counts.memberships} accesos eliminados. Quedan ${res.counts.preservedUsers} usuarios (admins + prácticas). Registra una empresa nueva para operar.`
              : `Empresa eliminada con ${res.counts.memberships} accesos y ${res.counts.users} usuarios podados. Quedan ${res.counts.preservedUsers} usuarios.`,
          ok: true,
        });
        setConfirm("");
        setReason("");
        setPreview(null);
      }
    } catch {
      setMsg({ text: "Error de red. Intenta de nuevo.", ok: false });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="overflow-hidden rounded-lg border-red-200">
      <div className="h-1 bg-gradient-to-r from-red-700 via-red-500 to-red-300" aria-hidden />
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-red-100 text-red-800">
            <DeleteForever className="h-4 w-4" aria-hidden />
          </span>
          <div>
            <CardTitle className="text-base tracking-tight">Limpiar base de datos</CardTitle>
            <CardDescription>Zona de peligro: borra lo operativo (todas o una empresa). Sin deshacer.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label htmlFor="clean-scope" className="mb-1 block text-sm font-medium">
              Alcance
            </label>
            <select
              id="clean-scope"
              value={scope}
              onChange={(e) => {
                setScope(e.target.value);
                setPreview(null);
              }}
              disabled={busy || previewBusy}
              className={inputClassName}
            >
              <option value="">Todas las empresas</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.razonSocial} · {c.rif}
                </option>
              ))}
            </select>
          </div>
          <Button type="button" variant="outline" disabled={previewBusy || busy} onClick={runPreview}>
            {previewBusy ? (
              <>
                <Spinner label="Calculando vista previa" />
                Calculando…
              </>
            ) : (
              "Vista previa (simulacro)"
            )}
          </Button>
          {preview && (
            <div className="rounded-md border border-periwinkle-200 px-3 py-2.5 text-sm" role="status">
              <p className="font-medium">
                Se borrarían {preview.totalFilas} fila(s) + {preview.usuariosAEliminar} usuario(s).
                Preservados: {preview.preservedUsers}.
              </p>
              {preview.tables.length > 0 && (
                <ul className="mt-1 list-disc space-y-0.5 pl-5 text-periwinkle-700">
                  {preview.tables.slice(0, 12).map((t) => (
                    <li key={t.tabla}>
                      {t.tabla}: {t.filas}
                    </li>
                  ))}
                </ul>
              )}
              {preview.tables.length === 0 && <p>Alcance ya vacío: nada que borrar.</p>}
            </div>
          )}
          <div className="grid gap-3 rounded-md bg-periwinkle-50/70 p-3 text-sm sm:grid-cols-2">
            <div>
              <p className="font-semibold text-red-800">Se elimina</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-5 text-periwinkle-700">
                <li>Todas las empresas y sucursales</li>
                <li>Terceros, documentos, pagos, retenciones</li>
                <li>Reglas y conceptos por empresa, series</li>
                <li>Períodos, importaciones, reportes, RDF</li>
                <li>Adjuntos, obligaciones, bitácora</li>
                <li>Usuarios no preservados y sus accesos</li>
              </ul>
            </div>
            <div>
              <p className="font-semibold text-icy-aqua-700">Se conserva</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-5 text-periwinkle-700">
                <li>Usuarios admin (rol admin)</li>
                <li>4 cuentas de práctica (@practica.local)</li>
                <li>Conceptos ISLR globales</li>
                <li>Regla IVA 75 % global (seed)</li>
                <li>Historial de migraciones aplicadas</li>
              </ul>
            </div>
          </div>
          <p className="flex items-start gap-2 text-sm text-periwinkle-500">
            <Storage className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            {scope === ""
              ? "Tras limpiar todo quedas sin empresas: registra una nueva para operar. Descarga un backup antes si necesitas los datos."
              : "Se elimina la empresa con todo su operativo; los usuarios de otras empresas no se tocan."}
          </p>
          <div>
            <label htmlFor="clean-confirm" className="mb-1 block text-sm font-medium">
              Escribe ELIMINAR para confirmar
            </label>
            <input
              id="clean-confirm"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="ELIMINAR"
              required
              disabled={busy}
              autoComplete="off"
              className={inputClassName}
            />
          </div>
          <div>
            <label htmlFor="clean-reason" className="mb-1 block text-sm font-medium">
              Motivo (queda en el log del servidor)
            </label>
            <input
              id="clean-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="p. ej. entorno de pruebas listo para producción"
              required
              disabled={busy}
              autoComplete="off"
              className={inputClassName}
            />
          </div>
          <Button type="submit" disabled={busy} className="bg-red-700 text-white hover:bg-red-800">
            {busy ? (
              <>
                <Spinner label="Limpiando" />
                Limpiando…
              </>
            ) : scope === "" ? (
              "Eliminar todo"
            ) : (
              "Eliminar empresa"
            )}
          </Button>
          {msg && <Msg text={msg.text} ok={msg.ok} />}
        </form>
      </CardContent>
    </Card>
  );
}
