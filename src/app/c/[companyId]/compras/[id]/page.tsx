import Link from "next/link";
import { redirect } from "next/navigation";
import Decimal from "decimal.js";
import ArrowBack from "@mui/icons-material/ArrowBack";
import Business from "@mui/icons-material/Business";
import Cancel from "@mui/icons-material/Cancel";
import CheckCircle from "@mui/icons-material/CheckCircle";
import ReceiptLong from "@mui/icons-material/ReceiptLong";
import History from "@mui/icons-material/History";
import Source from "@mui/icons-material/Source";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Reveal } from "@/components/ui/reveal";
import { AppHeader, PageFooter } from "@/components/layout/app-shell";
import { getSessionUser, listMemberships } from "@/modules/identity/session";
import { getCompanyContext } from "@/modules/tenancy/repo";
import { authorize } from "@/modules/tenancy/authorize";
import { listPeriods } from "@/modules/periods/service";
import { getPurchaseDetail } from "@/modules/fiscal-docs/service";
import { VoidPurchaseForm } from "./void-form";

/** "1234567.89" → "1.234.567,89" (solo presentación es-VE). */
function fmtMonto(s: string | null | undefined): string {
  try {
    const d = new Decimal(s || 0).toFixed(2);
    const [ent = "0", dec = "00"] = d.split(".");
    return `${ent.replace(/\B(?=(\d{3})+(?!\d))/g, ".")},${dec}`;
  } catch {
    return String(s ?? "—");
  }
}

function fmtFecha(iso: string | null | undefined): string {
  if (!iso) return "—";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso));
  return m ? `${m[3]}-${m[2]}-${m[1]}` : String(iso);
}

function formatDateTime(v: unknown): string {
  if (!v) return "—";
  const d = v instanceof Date ? v : new Date(String(v));
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("es-VE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatRange(range: unknown): string {
  if (typeof range !== "string") return "—";
  const m = range.replace(/[[)()\]]/g, "").split(",");
  if (m.length !== 2 || !m[0] || !m[1]) return range;
  return `${fmtFecha(m[0].trim())} → ${fmtFecha(m[1].trim())}`;
}

const statusMeta: Record<string, { label: string; variant: "success" | "warning" | "muted" | "outline" | "destructive" }> = {
  draft: { label: "Borrador", variant: "outline" },
  imported: { label: "Importada", variant: "secondary" as never as "outline" },
  under_review: { label: "En revisión", variant: "warning" },
  validated: { label: "Validada", variant: "success" },
  included: { label: "Incluida", variant: "success" },
  voided: { label: "Anulada", variant: "destructive" },
};

const kindMeta: Record<string, string> = {
  invoice: "Factura",
  credit_note: "Nota de crédito",
  debit_note: "Nota de débito",
  import: "Importación",
  exempt: "Exenta",
  no_credit: "Sin derecho a crédito",
};

const catMeta: Record<string, string> = {
  general: "General",
  reduced: "Reducida",
  additional: "Adicional",
  exempt: "Exenta",
  no_subject: "No sujeta",
  no_credit: "Sin crédito",
};

export default async function CompraDetallePage({
  params,
}: {
  params: Promise<{ companyId: string; id: string }>;
}) {
  const { companyId, id } = await params;
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const ctx = await getCompanyContext(companyId, user.id);
  if (!ctx) redirect("/dashboard");
  const memberships = await listMemberships(user.id);
  const base = `/c/${companyId}`;

  const data = await getPurchaseDetail({ companyId, userId: user.id }, id);
  if (!data) redirect(`${base}/compras`);
  const { doc, party, lines, origin, trail } = data;

  const periods = await listPeriods({ companyId, userId: user.id });
  const per = periods.find((p) => p.id === (doc as { fiscalPeriodId?: string }).fiscalPeriodId);
  const perClosed = per?.status === "closed";
  const canVoid = (await authorize(companyId, user.id, "docs.create")).ok;
  const docStatus = (doc as { status?: string }).status ?? "";
  const voidable = docStatus === "validated" || docStatus === "included";

  const st = statusMeta[(doc as { status?: string }).status ?? ""] ?? {
    label: (doc as { status?: string }).status ?? "—",
    variant: "outline" as const,
  };

  // Invariante 1: base + IVA debe igualar total (tolerancia 0,01).
  let inv1Ok = true;
  try {
    inv1Ok = new Decimal((doc as { baseImponible?: string }).baseImponible || 0)
      .plus((doc as { ivaCausado?: string }).ivaCausado || 0)
      .minus((doc as { total?: string }).total || 0)
      .abs()
      .lte("0.01");
  } catch {
    inv1Ok = false;
  }
  const sumBase = lines.reduce((a, l) => { try { return a.plus(l.base || 0); } catch { return a; } }, new Decimal(0));
  const sumIva = lines.reduce((a, l) => { try { return a.plus(l.iva || 0); } catch { return a; } }, new Decimal(0));

  const kpis = [
    { label: "Base imponible", value: fmtMonto((doc as { baseImponible?: string }).baseImponible) },
    { label: "IVA causado", value: fmtMonto((doc as { ivaCausado?: string }).ivaCausado) },
    { label: "Total", value: fmtMonto((doc as { total?: string }).total), highlight: true },
  ];

  const affectedId = (doc as { affectedDocumentId?: string | null }).affectedDocumentId;

  return (
    <div className="min-h-screen bg-white text-periwinkle-900 antialiased">
      <AppHeader
        title={`Compra · ${ctx.company?.razonSocial ?? "Empresa"}`}
        back={{ href: `${base}/compras`, label: "Compras" }}
        user={user}
        role={ctx.role}
        companyCount={memberships.length}
        branding={{
          color: ctx.company?.colorDistintivo ?? null,
          logoUrl: ctx.company?.logoUrl ?? null,
        }}
      />

      <main className="mx-auto max-w-6xl px-6 pb-16">
        {/* Hero */}
        <section className="relative overflow-hidden pt-10">
          <div
            className="pointer-events-none absolute -top-24 left-1/3 h-72 w-[36rem] -translate-x-1/2 rounded-full bg-gradient-to-r from-[#37c8a1]/10 via-[#352574]/5 to-transparent blur-3xl"
            aria-hidden
          />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Badge variant="outline" className="rounded-md px-3 py-1">
                Documento fiscal · {kindMeta[(doc as { kind?: string }).kind ?? ""] ?? (doc as { kind?: string }).kind ?? "Compra"}
              </Badge>
              <h1 className="mt-3 text-balance font-mono text-3xl font-bold tracking-tight tabular-nums sm:text-4xl">
                {(doc as { docNumber?: string }).docNumber ?? "—"}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge variant={st.variant}>{st.label}</Badge>
                <Badge variant={inv1Ok ? "success" : "destructive"}>
                  {inv1Ok ? "Base + IVA = total" : "Total no cuadra"}
                </Badge>
                {perClosed && <Badge variant="muted">Período cerrado · inmutable</Badge>}
              </div>
              <p className="mt-2 max-w-2xl text-sm text-periwinkle-500">
                {party ? (
                  <>
                    <Link
                      href={`${base}/terceros/${party.id}`}
                      className="font-medium text-[#352574] underline decoration-periwinkle-300 underline-offset-2 hover:text-[#120c27]"
                    >
                      {party.razonSocial}
                    </Link>{" "}
                    <span className="font-mono">({party.rifOriginal})</span>
                    {" · "}
                  </>
                ) : null}
                Fiscal {fmtFecha((doc as { fechaFiscal?: string }).fechaFiscal)}
                {" · Control "}
                <span className="font-mono">{(doc as { controlNumber?: string }).controlNumber ?? "—"}</span>
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              {per && (
                <Button asChild variant="outline">
                  <Link href={`${base}/periodos/${per.id}`}>
                    Ver período
                  </Link>
                </Button>
              )}
              <Button asChild>
                <Link href={`${base}/reportes/libro-compras`}>
                  <ReceiptLong aria-hidden />
                  Libro de Compras
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* KPIs */}
        <section className="mt-8" aria-label="Montos del documento">
          <div className="grid gap-4 sm:grid-cols-3">
            {kpis.map((k, i) => (
              <Reveal key={k.label} delay={(i % 3) * 80} className="h-full">
                <Card
                  className={
                    "highlight" in k && k.highlight
                      ? "h-full rounded-lg border-[#352574]/30 bg-gradient-to-br from-[#120c27] to-[#352574] text-white"
                      : "h-full rounded-lg"
                  }
                >
                  <CardContent className="p-5">
                    <p
                      className={
                        "highlight" in k && k.highlight
                          ? "text-[11px] font-semibold uppercase tracking-wider text-white/70"
                          : "text-[11px] font-semibold uppercase tracking-wider text-icy-aqua-700"
                      }
                    >
                      {k.label}
                    </p>
                    <p className="mt-1 font-mono text-2xl font-bold tracking-tight tabular-nums">
                      {k.value}
                    </p>
                  </CardContent>
                </Card>
              </Reveal>
            ))}
          </div>
        </section>

        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          {/* Ficha */}
          <Reveal className="h-full">
            <Card className="h-full rounded-lg">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base tracking-tight">
                  <Business className="h-4 w-4 text-periwinkle-500" aria-hidden />
                  Ficha del documento
                </CardTitle>
                <CardDescription>
                  Hecho fiscal del que derivan libro, resumen y retenciones.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <dl className="divide-y divide-periwinkle-100 text-sm">
                  <div className="flex items-center justify-between gap-4 py-2.5">
                    <dt className="text-periwinkle-500">Proveedor</dt>
                    <dd className="max-w-60 truncate text-right">
                      {party ? (
                        <Link
                          href={`${base}/terceros/${party.id}`}
                          className="font-medium text-[#352574] underline decoration-periwinkle-300 underline-offset-2 hover:text-[#120c27]"
                        >
                          {party.razonSocial}
                        </Link>
                      ) : "—"}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-4 py-2.5">
                    <dt className="text-periwinkle-500">RIF</dt>
                    <dd className="font-mono">{party?.rifOriginal ?? "—"}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-4 py-2.5">
                    <dt className="text-periwinkle-500">Factura</dt>
                    <dd className="font-mono font-semibold">{(doc as { docNumber?: string }).docNumber ?? "—"}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-4 py-2.5">
                    <dt className="text-periwinkle-500">N° control</dt>
                    <dd className="font-mono">{(doc as { controlNumber?: string }).controlNumber ?? "—"}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-4 py-2.5">
                    <dt className="text-periwinkle-500">Tipo</dt>
                    <dd>{kindMeta[(doc as { kind?: string }).kind ?? ""] ?? (doc as { kind?: string }).kind ?? "—"}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-4 py-2.5">
                    <dt className="text-periwinkle-500">Fecha documento</dt>
                    <dd className="font-mono tabular-nums">{fmtFecha((doc as { fechaDocumento?: string }).fechaDocumento)}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-4 py-2.5">
                    <dt className="text-periwinkle-500">Fecha recepción</dt>
                    <dd className="font-mono tabular-nums">{fmtFecha((doc as { fechaRecepcion?: string }).fechaRecepcion)}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-4 py-2.5">
                    <dt className="text-periwinkle-500">Fecha fiscal</dt>
                    <dd className="font-mono font-semibold tabular-nums">{fmtFecha((doc as { fechaFiscal?: string }).fechaFiscal)}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-4 py-2.5">
                    <dt className="text-periwinkle-500">Período</dt>
                    <dd>
                      {per ? (
                        <Link
                          href={`${base}/periodos/${per.id}`}
                          className="font-mono text-[#352574] underline decoration-periwinkle-300 underline-offset-2 hover:text-[#120c27]"
                        >
                          {formatRange(per.range)}
                        </Link>
                      ) : (
                        <span className="font-mono text-xs">{(doc as { fiscalPeriodId?: string }).fiscalPeriodId ?? "—"}</span>
                      )}
                    </dd>
                  </div>
                  {affectedId && (
                    <div className="flex items-center justify-between gap-4 py-2.5">
                      <dt className="text-periwinkle-500">Documento afectado</dt>
                      <dd>
                        <Link
                          href={`${base}/compras/${affectedId}`}
                          className="font-mono text-[#352574] underline decoration-periwinkle-300 underline-offset-2 hover:text-[#120c27]"
                        >
                          Ver afectada
                        </Link>
                      </dd>
                    </div>
                  )}
                  {((doc as { currency?: string }).currency || (doc as { fxRate?: string }).fxRate) && (
                    <div className="flex items-center justify-between gap-4 py-2.5">
                      <dt className="text-periwinkle-500">Moneda / tasa</dt>
                      <dd className="font-mono text-xs">
                        {(doc as { currency?: string }).currency ?? "—"}
                        {(doc as { fxRate?: string }).fxRate ? ` · ${(doc as { fxRate?: string }).fxRate}` : ""}
                      </dd>
                    </div>
                  )}
                </dl>
                {perClosed && (
                  <p className="mt-3 rounded-md bg-periwinkle-50 px-3 py-2.5 text-sm text-periwinkle-500">
                    Este documento está en un período cerrado: no admite
                    edición. Cualquier corrección requiere reapertura con motivo
                    o ajuste en un período abierto.
                  </p>
                )}
              </CardContent>
            </Card>
          </Reveal>

          {/* Origen + trazabilidad resumen */}
          <div className="flex flex-col gap-4">
            <Reveal>
              <Card className="rounded-lg">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base tracking-tight">
                    <Source className="h-4 w-4 text-periwinkle-500" aria-hidden />
                    Origen
                  </CardTitle>
                  <CardDescription>
                    Trazabilidad total → documento → fila CSV → archivo.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {origin ? (
                    <dl className="divide-y divide-periwinkle-100 text-sm">
                      <div className="flex items-center justify-between gap-4 py-2">
                        <dt className="text-periwinkle-500">Archivo</dt>
                        <dd className="max-w-60 truncate text-right font-medium" title={origin.fileName ?? ""}>
                          {origin.fileName ?? "—"}
                        </dd>
                      </div>
                      <div className="flex items-center justify-between gap-4 py-2">
                        <dt className="text-periwinkle-500">SHA-256</dt>
                        <dd className="font-mono text-xs" title={origin.sha256 ?? ""}>
                          {origin.sha256 ? `${origin.sha256.slice(0, 16)}…` : "—"}
                        </dd>
                      </div>
                      <div className="flex items-center justify-between gap-4 py-2">
                        <dt className="text-periwinkle-500">Fila</dt>
                        <dd className="font-mono">{origin.row ?? "—"}</dd>
                      </div>
                      <div className="pt-2">
                        <Link
                          href={`${base}/importaciones/${origin.batchId}`}
                          className="inline-flex items-center gap-1 text-sm font-medium text-[#352574] underline decoration-periwinkle-300 underline-offset-2 hover:text-[#120c27]"
                        >
                          Ver lote de importación
                        </Link>
                      </div>
                    </dl>
                  ) : (
                    <p className="rounded-md bg-periwinkle-50 px-3 py-2.5 text-sm text-periwinkle-500">
                      Carga manual: sin archivo de origen. La bitácora registra
                      quién y cuándo la creó.
                    </p>
                  )}
                </CardContent>
              </Card>
            </Reveal>

            <Reveal delay={80}>
              <Card className="rounded-lg">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base tracking-tight">
                    <History className="h-4 w-4 text-periwinkle-500" aria-hidden />
                    Bitácora ({trail.length})
                  </CardTitle>
                  <CardDescription>
                    Eventos append-only de este documento.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {trail.length === 0 ? (
                    <p className="text-sm text-periwinkle-500">
                      Sin eventos registrados.
                    </p>
                  ) : (
                    <ol className="relative space-y-3 border-l border-periwinkle-200 pl-4">
                      {trail.slice(0, 8).map((t) => (
                        <li key={t.id} className="text-sm">
                          <p className="font-medium">{t.action}</p>
                          <p className="font-mono text-xs tabular-nums text-periwinkle-500">
                            {formatDateTime(t.occurredAt)}
                          </p>
                          {t.reason && (
                            <p className="mt-0.5 text-xs text-periwinkle-500">{t.reason}</p>
                          )}
                        </li>
                      ))}
                    </ol>
                  )}
                  {trail.length > 8 && (
                    <p className="mt-3 text-xs text-periwinkle-500">
                      +{trail.length - 8} eventos más.{" "}
                      <Link
                        href={`${base}/auditoria`}
                        className="font-medium text-[#352574] underline decoration-periwinkle-300 underline-offset-2 hover:text-[#120c27]"
                      >
                        Ver bitácora completa
                      </Link>
                    </p>
                  )}
                </CardContent>
              </Card>
            </Reveal>
          </div>
        </div>

        {/* Líneas */}
        <section className="mt-8" aria-label="Líneas del documento">
          <Reveal>
            <Card className="overflow-hidden rounded-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-base tracking-tight">
                  Líneas ({lines.length})
                </CardTitle>
                <CardDescription>
                  Σ bases {fmtMonto(sumBase.toFixed(2))} · Σ IVA {fmtMonto(sumIva.toFixed(2))} · clasificación fiscal por línea.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[44rem] text-sm">
                    <thead>
                      <tr className="border-y border-periwinkle-200 bg-periwinkle-50/70 text-left text-[11px] font-semibold uppercase tracking-wider text-periwinkle-500">
                        <th scope="col" className="px-4 py-3">#</th>
                        <th scope="col" className="px-4 py-3">Categoría</th>
                        <th scope="col" className="px-4 py-3">Alícuota</th>
                        <th scope="col" className="px-4 py-3">Descripción</th>
                        <th scope="col" className="px-4 py-3 text-right">Base</th>
                        <th scope="col" className="px-4 py-3 text-right">IVA</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lines.map((l) => (
                        <tr
                          key={l.id}
                          className="border-b border-periwinkle-100 last:border-0"
                        >
                          <td className="whitespace-nowrap px-4 py-3 font-mono tabular-nums">
                            {l.lineNumber}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3">
                            <Badge variant="outline">
                              {catMeta[l.taxCategory ?? ""] ?? l.taxCategory ?? "—"}
                            </Badge>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 font-mono text-periwinkle-500">
                            {l.taxRate ?? "—"}
                          </td>
                          <td className="max-w-56 truncate px-4 py-3 text-periwinkle-500" title={(l as { description?: string | null }).description ?? ""}>
                            {(l as { description?: string | null }).description ?? "—"}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right font-mono tabular-nums">
                            {fmtMonto(l.base)}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right font-mono tabular-nums">
                            {fmtMonto(l.iva)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-periwinkle-200 bg-periwinkle-50/70 font-semibold">
                        <td colSpan={4} className="px-4 py-3 text-right text-xs uppercase tracking-wider text-periwinkle-500">
                          Totales líneas
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right font-mono tabular-nums">
                          {fmtMonto(sumBase.toFixed(2))}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right font-mono tabular-nums">
                          {fmtMonto(sumIva.toFixed(2))}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </CardContent>
            </Card>
          </Reveal>
        </section>

        {/* Verificación Inv.1 */}
        <section className="mt-8" aria-label="Verificación de invariantes">
          <Reveal>
            <Card className="overflow-hidden rounded-lg">
              <div
                className="h-1 bg-gradient-to-r from-[#120c27] via-[#352574] to-[#37c8a1]"
                aria-hidden
              />
              <CardContent className="flex items-start gap-3 p-5">
                {inv1Ok ? (
                  <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-icy-aqua-700" aria-hidden />
                ) : (
                  <Cancel className="mt-0.5 h-5 w-5 shrink-0 text-red-600" aria-hidden />
                )}
                <p className="text-sm text-periwinkle-700">
                  <span className="font-semibold text-[#120c27]">
                    Invariante 1 {inv1Ok ? "verificado" : "con diferencia"}:{" "}
                  </span>
                  base ({fmtMonto((doc as { baseImponible?: string }).baseImponible)}) + IVA ({fmtMonto((doc as { ivaCausado?: string }).ivaCausado)}){" "}
                  {inv1Ok ? "=" : "≠"} total ({fmtMonto((doc as { total?: string }).total)}), tolerancia 0,01.
                  {affectedId || (doc as { kind?: string }).kind === "credit_note" || (doc as { kind?: string }).kind === "debit_note"
                    ? " Las NC/ND requieren documento afectado (Inv. 3)."
                    : ""}
                </p>
              </CardContent>
            </Card>
          </Reveal>
        </section>

        {/* Anulación */}
        {(docStatus === "voided" || (canVoid && voidable)) && (
          <section className="mt-8" aria-label="Anulación del documento">
            <Reveal>
              <Card className="rounded-lg">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base tracking-tight">Anulación</CardTitle>
                  <CardDescription>
                    Anula sin borrar ni liberar número. El motivo queda en auditoría.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {docStatus === "voided" ? (
                    <p className="text-sm text-periwinkle-500">
                      Documento anulado: no se edita ni se re-anula. El motivo consta en la bitácora.
                    </p>
                  ) : perClosed ? (
                    <p className="text-sm text-periwinkle-500">
                      Período cerrado: requiere reapertura para anular.
                    </p>
                  ) : (
                    <VoidPurchaseForm companyId={companyId} id={id} />
                  )}
                </CardContent>
              </Card>
            </Reveal>
          </section>
        )}

        <div className="mt-8">
          <Link
            href={`${base}/compras`}
            className="inline-flex items-center gap-1.5 rounded-md text-sm text-periwinkle-500 transition-colors hover:text-[#120c27]"
          >
            <ArrowBack className="h-4 w-4" aria-hidden />
            Volver a compras
          </Link>
        </div>
      </main>

      <PageFooter context={ctx.company?.razonSocial ?? "Empresa"} />
    </div>
  );
}
