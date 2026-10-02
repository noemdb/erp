import Link from "next/link";
import { redirect } from "next/navigation";
import Add from "@mui/icons-material/Add";
import InfoOutlined from "@mui/icons-material/InfoOutlined";
import UploadFile from "@mui/icons-material/UploadFile";
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
import { listBatches } from "@/modules/imports/service";
import { TemplateDialog } from "./template-dialog";
import {
  BATCH_STATUS_ES,
  BATCH_STATUS_VARIANT,
  KIND_ES,
  SOURCE_ES,
  es,
} from "@/modules/imports/labels";

export default async function ImportacionesPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = await params;
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const ctx = await getCompanyContext(companyId, user.id);
  if (!ctx) redirect("/dashboard");
  const memberships = await listMemberships(user.id);
  const base = `/c/${companyId}`;
  const canImport = (await authorize(companyId, user.id, "imports.run")).ok;

  const rows = await listBatches({ companyId, userId: user.id });
  const sorted = [...rows].sort((a, b) =>
    String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? ""))
  );

  const pending = sorted.filter((r) =>
    ["uploaded", "mapping", "validating"].includes(r.status ?? "")
  ).length;
  const ready = sorted.filter((r) =>
    ["validated", "partially_imported"].includes(r.status ?? "")
  ).length;
  const done = sorted.filter((r) => r.status === "completed").length;

  const kpis = [
    { label: "Lotes", value: String(sorted.length) },
    { label: "Por validar", value: String(pending) },
    { label: "Listos p. confirmar", value: String(ready) },
    { label: "Completados", value: String(done) },
  ];

  return (
    <div className="min-h-screen bg-white text-periwinkle-900 antialiased">
      <AppHeader
        title={`Importaciones · ${ctx.company?.razonSocial ?? "Empresa"}`}
        back={{ href: base, label: "Panel" }}
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
                Staging · CSV legacy y Z
              </Badge>
              <h1 className="mt-3 text-balance text-3xl font-bold tracking-tight sm:text-4xl">
                Importaciones
              </h1>
              <p className="mt-2 max-w-xl text-sm text-periwinkle-500">
                Archivo → lote → validación por fila → confirmación a
                documentos. Nada entra directo: lo rechazado se descarga y se
                corrige.
              </p>
            </div>
            {canImport && (
              <div className="flex shrink-0 flex-wrap gap-2">
                <TemplateDialog companyId={companyId} />
                <Button asChild>
                  <Link href={`${base}/importaciones/nueva`}>
                    <Add aria-hidden />
                    Subir CSV
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </section>

        {/* Indicadores */}
        <section className="mt-8" aria-label="Estado de lotes">
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

        {/* Tabla */}
        <section className="mt-8" aria-label="Lotes de importación">
          <Reveal>
            <Card className="overflow-hidden rounded-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-base tracking-tight">
                  Lotes de la empresa
                </CardTitle>
                <CardDescription>
                  {sorted.length === 0
                    ? "Aún no hay lotes. Sube el CSV del legacy o de la máquina fiscal."
                    : `${sorted.length} ${sorted.length === 1 ? "lote" : "lotes"}, del más reciente al más antiguo.`}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {sorted.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
                    <span className="flex h-12 w-12 items-center justify-center rounded-md bg-periwinkle-100 text-[#120c27]">
                      <UploadFile className="h-6 w-6" aria-hidden />
                    </span>
                    <p className="max-w-sm text-sm text-periwinkle-500">
                      El archivo original se conserva íntegro como evidencia y
                      el mismo archivo nunca se duplica (idempotencia por
                      sha256).
                    </p>
                    {canImport && (
                      <Button asChild>
                        <Link href={`${base}/importaciones/nueva`}>
                          <Add aria-hidden />
                          Subir primer CSV
                        </Link>
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[52rem] text-sm">
                      <thead>
                        <tr className="border-y border-periwinkle-200 bg-periwinkle-50/70 text-left text-[11px] font-semibold uppercase tracking-wider text-periwinkle-500">
                          <th scope="col" className="px-4 py-3">Tipo</th>
                          <th scope="col" className="px-4 py-3">Fuente</th>
                          <th scope="col" className="px-4 py-3">Estado</th>
                          <th scope="col" className="px-4 py-3 text-right">Válidas</th>
                          <th scope="col" className="px-4 py-3 text-right">Advertencias</th>
                          <th scope="col" className="px-4 py-3 text-right">Rechazadas</th>
                          <th scope="col" className="px-4 py-3 text-right">Total filas</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sorted.map((r) => (
                          <tr
                            key={r.id}
                            className="border-b border-periwinkle-100 transition-colors last:border-0 hover:bg-periwinkle-50/60"
                          >
                            <td className="whitespace-nowrap px-4 py-3 font-medium">
                              <Link
                                href={`${base}/importaciones/${r.id}`}
                                className="text-[#352574] underline decoration-periwinkle-300 underline-offset-2 transition-colors hover:text-[#120c27]"
                              >
                                {es(KIND_ES, r.kind)}
                              </Link>
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-periwinkle-500">
                              {es(SOURCE_ES, r.sourceSystem)}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3">
                              <Badge variant={BATCH_STATUS_VARIANT[r.status ?? ""] ?? "outline"}>
                                {es(BATCH_STATUS_ES, r.status)}
                              </Badge>
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                              {r.validRows}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                              {r.warningRows}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                              {r.rejectedRows}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                              {r.totalRows}
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

        {!canImport && (
          <p className="mt-4 flex items-start gap-2 rounded-md bg-periwinkle-50 px-3 py-2.5 text-sm text-periwinkle-500">
            <InfoOutlined className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            Tu rol ({ctx.role}) es de solo lectura aquí. La importación la
            ejecutan administrativo y contador.
          </p>
        )}
      </main>

      <PageFooter context={ctx.company?.razonSocial ?? "Empresa"} />
    </div>
  );
}
