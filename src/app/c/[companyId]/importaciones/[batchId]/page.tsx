import Link from "next/link";
import { redirect } from "next/navigation";
import ArrowBack from "@mui/icons-material/ArrowBack";
import Download from "@mui/icons-material/Download";
import InfoOutlined from "@mui/icons-material/InfoOutlined";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress";
import { Reveal } from "@/components/ui/reveal";
import { AppHeader, PageFooter } from "@/components/layout/app-shell";
import { getSessionUser, listMemberships } from "@/modules/identity/session";
import { getCompanyContext } from "@/modules/tenancy/repo";
import { authorize } from "@/modules/tenancy/authorize";
import { getBatch } from "@/modules/imports/service";
import {
  BATCH_STATUS_ES,
  BATCH_STATUS_VARIANT,
  KIND_ES,
  ROW_STATUS_ES,
  ROW_STATUS_VARIANT,
  SOURCE_ES,
  es,
  motivoColumna,
} from "@/modules/imports/labels";
import { ValidateButton } from "./validate-button";
import { ConfirmButton } from "./confirm-button";
import { RowStatusFilter } from "./row-status-filter";

const ROW_STATUS_ORDER = ["pending", "valid", "warning", "rejected", "imported"] as const;

const NEXT_STEP: Record<string, string> = {
  uploaded: "Valida las filas para clasificarlas en válidas, advertencias y rechazadas.",
  mapping: "Aplica el perfil de mapeo y vuelve a validar.",
  validating: "Validación en curso. Actualiza en unos segundos.",
  validated: "Confirma para crear los documentos. Solo entran válidas y advertencias.",
  partially_imported: "Puedes confirmar de nuevo tras corregir las rechazadas.",
  completed: "Lote completado: los documentos ya viven con trazabilidad al archivo y la fila.",
  failed: "Revisa el archivo y sube de nuevo.",
};

export default async function LotePage({
  params,
  searchParams,
}: {
  params: Promise<{ companyId: string; batchId: string }>;
  searchParams?: Promise<{ estado?: string | string[] }>;
}) {
  const { companyId, batchId } = await params;
  const sp = searchParams ? await searchParams : {};
  const rawList = sp.estado == null ? [] : Array.isArray(sp.estado) ? sp.estado : [sp.estado];
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const ctx = await getCompanyContext(companyId, user.id);
  if (!ctx) redirect("/dashboard");
  const memberships = await listMemberships(user.id);
  const base = `/c/${companyId}`;

  const c = { companyId, userId: user.id };
  const data = await getBatch(c, batchId);
  if (!data) redirect(`${base}/importaciones`);
  const { batch, rows } = data;
  const canImport = (await authorize(companyId, user.id, "imports.run")).ok;
  const sorted = [...rows].sort((a, b) => a.rowNumber - b.rowNumber);
  const validSet = new Set<string>(ROW_STATUS_ORDER);
  const selectedEstados = [
    ...new Set(
      rawList
        .flatMap((v) => String(v).split(","))
        .map((v) => v.trim())
        .filter((v) => validSet.has(v)),
    ),
  ];
  const batchBase = `${base}/importaciones/${batchId}`;
  const counts = new Map<string, number>();
  for (const r of sorted) counts.set(r.status ?? "—", (counts.get(r.status ?? "—") ?? 0) + 1);
  const visible =
    selectedEstados.length === 0
      ? sorted
      : sorted.filter((r) => selectedEstados.includes(r.status ?? ""));
  const filterOptions = ROW_STATUS_ORDER.map((s) => ({
    value: s,
    label: es(ROW_STATUS_ES, s),
    count: counts.get(s) ?? 0,
  }));
  const selectedLabels = selectedEstados.map((s) => es(ROW_STATUS_ES, s)).join(", ");
  const ignoredColumns =
    (batch.mappingProfile as { ignoredColumns?: string[] } | null)?.ignoredColumns ?? [];

  const kpis = [
    { label: "Total", value: String(batch.totalRows) },
    { label: "Válidas", value: String(batch.validRows) },
    { label: "Advertencias", value: String(batch.warningRows) },
    { label: "Rechazadas", value: String(batch.rejectedRows) },
  ];

  return (
    <div className="min-h-screen bg-white text-periwinkle-900 antialiased">
      <AppHeader
        title={`Importaciones · ${ctx.company?.razonSocial ?? "Empresa"}`}
        back={{ href: `${base}/importaciones`, label: "Importaciones" }}
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
          <div className="relative">
            <Badge variant="outline" className="rounded-md px-3 py-1">
              Lote · {es(KIND_ES, batch.kind)} · {es(SOURCE_ES, batch.sourceSystem)}
            </Badge>
            <h1 className="mt-3 text-balance text-3xl font-bold tracking-tight sm:text-4xl">
              Lote {es(KIND_ES, batch.kind)}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge variant={BATCH_STATUS_VARIANT[batch.status ?? ""] ?? "outline"}>
                {es(BATCH_STATUS_ES, batch.status)}
              </Badge>
              <span className="text-sm text-periwinkle-500">
                {NEXT_STEP[batch.status ?? ""] ?? ""}
              </span>
            </div>
          </div>
        </section>

        {/* Indicadores */}
        <section className="mt-8" aria-label="Contadores del lote">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {kpis.map((k, i) => (
              <Reveal key={k.label} delay={(i % 4) * 80} className="h-full">
                <Card className="h-full rounded-lg">
                  <CardContent className="p-5">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-icy-aqua-700">
                      {k.label}
                    </p>
                    <p className="mt-1 text-2xl font-bold tracking-tight tabular-nums">
                      {k.value}
                    </p>
                  </CardContent>
                </Card>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Progreso + acciones */}
        <section className="mt-8" aria-label="Avance y acciones">
          <Reveal>
            <Card className="overflow-hidden rounded-lg">
              <div
                className="h-1 bg-gradient-to-r from-[#120c27] via-[#352574] to-[#37c8a1]"
                aria-hidden
              />
              <CardContent className="flex flex-col gap-4 p-5">
                {batch.status !== "uploaded" && batch.totalRows > 0 && (
                  <ProgressBar
                    value={batch.validRows}
                    max={batch.totalRows}
                    label={`Filas válidas: ${batch.validRows} de ${batch.totalRows}`}
                  />
                )}
                {canImport ? (
                  <div className="flex flex-wrap items-center gap-3">
                    {batch.status === "uploaded" && (
                      <ValidateButton companyId={companyId} batchId={batchId} />
                    )}
                    {(batch.status === "validated" ||
                      batch.status === "partially_imported") && (
                      <>
                        <ConfirmButton companyId={companyId} batchId={batchId} />
                        <Link
                          href={`/api/companies/${companyId}/imports/${batchId}/rejected.csv`}
                          className="inline-flex items-center gap-1.5 rounded-md border border-periwinkle-300 bg-white px-5 text-sm font-medium text-[#120c27] transition-colors hover:bg-periwinkle-50 h-9"
                        >
                          <Download className="h-4 w-4" aria-hidden />
                          Descargar rechazadas
                        </Link>
                      </>
                    )}
                  </div>
                ) : (
                  <p className="flex items-start gap-2 rounded-md bg-periwinkle-50 px-3 py-2.5 text-sm text-periwinkle-500">
                    <InfoOutlined className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                    Tu rol ({ctx.role}) es de solo lectura aquí.
                  </p>
                )}
              </CardContent>
            </Card>
          </Reveal>
        </section>

        {/* Columnas informativas no consumidas */}
        {ignoredColumns.length > 0 && (
          <section className="mt-8" aria-label="Columnas no consumidas">
            <p className="flex items-start gap-2 rounded-md bg-periwinkle-50 px-3 py-2.5 text-sm text-periwinkle-500">
              <InfoOutlined className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span>
                Columnas informativas no consumidas:{" "}
                {ignoredColumns
                  .map((h) => `${h} (${motivoColumna(h)})`)
                  .join("; ")}
                .
              </span>
            </p>
          </section>
        )}

        {/* Filas */}
        <section className="mt-8" aria-label="Filas del lote">
          <Reveal>
            <Card className="overflow-visible rounded-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-base tracking-tight">
                  Filas del lote
                </CardTitle>
                <CardDescription>
                  {sorted.length === 0
                    ? "Sin filas cargadas todavía."
                    : selectedEstados.length === 0
                      ? `${sorted.length} ${sorted.length === 1 ? "fila" : "filas"} en orden de archivo.`
                      : `${visible.length} de ${sorted.length} filas · ${selectedLabels}.`}
                </CardDescription>
                {sorted.length > 0 && (
                  <RowStatusFilter
                    selected={selectedEstados}
                    baseHref={batchBase}
                    total={sorted.length}
                    options={filterOptions}
                  />
                )}
              </CardHeader>
              <CardContent className="p-0">
                {sorted.length === 0 ? (
                  <p className="px-5 pb-5 text-sm text-periwinkle-500">
                    Valida el lote para clasificar cada fila.
                  </p>
                ) : visible.length === 0 ? (
                  <p className="px-5 pb-5 text-sm text-periwinkle-500">
                    Sin filas en {selectedEstados.length === 1 ? "estado" : "estados"} “{selectedLabels}”.{" "}
                    <Link
                      href={batchBase}
                      className="text-[#352574] underline decoration-periwinkle-300 underline-offset-2 hover:text-[#120c27]"
                    >
                      Ver todas
                    </Link>
                    .
                  </p>
                ) : (
                  <div className="overflow-x-auto rounded-b-lg">
                    <table className="w-full min-w-[48rem] text-sm">
                      <thead>
                        <tr className="border-y border-periwinkle-200 bg-periwinkle-50/70 text-left text-[11px] font-semibold uppercase tracking-wider text-periwinkle-500">
                          <th scope="col" className="px-4 py-3 text-right">Fila</th>
                           <th scope="col" className="px-4 py-3">
                            <span className="inline-flex items-center gap-2">
                              Estado
                              {selectedEstados.length > 0 && (
                                <span className="sr-only">(filtrado por {selectedLabels})</span>
                              )}
                            </span>
                          </th>
                           <th scope="col" className="px-4 py-3">Errores / avisos</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visible.map((r) => (
                          <tr
                            key={r.id}
                            className="border-b border-periwinkle-100 last:border-0"
                          >
                            <td className="whitespace-nowrap px-4 py-3 text-right font-mono tabular-nums">
                              {r.rowNumber}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3">
                              <Badge variant={ROW_STATUS_VARIANT[r.status ?? ""] ?? "outline"}>
                                {es(ROW_STATUS_ES, r.status)}
                              </Badge>
                            </td>
                            <td
                              className="max-w-xl truncate px-4 py-3 text-periwinkle-500"
                              title={Array.isArray(r.errors) ? r.errors.join("; ") : ""}
                            >
                              {Array.isArray(r.errors) && r.errors.length > 0
                                ? r.errors.join("; ")
                                : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </Reveal>
        </section>

        <div className="mt-8">
          <Link
            href={`${base}/importaciones`}
            className="inline-flex items-center gap-1.5 rounded-md text-sm text-periwinkle-500 transition-colors hover:text-[#120c27]"
          >
            <ArrowBack className="h-4 w-4" aria-hidden />
            Volver a importaciones
          </Link>
        </div>
      </main>

      <PageFooter context={ctx.company?.razonSocial ?? "Empresa"} />
    </div>
  );
}
