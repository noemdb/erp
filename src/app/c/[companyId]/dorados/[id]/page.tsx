import Link from "next/link";
import { redirect } from "next/navigation";
import ArrowBack from "@mui/icons-material/ArrowBack";
import CheckCircle from "@mui/icons-material/CheckCircle";
import Warning from "@mui/icons-material/Warning";
import Lock from "@mui/icons-material/Lock";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Reveal } from "@/components/ui/reveal";
import { AppHeader, PageFooter } from "@/components/layout/app-shell";
import { getSessionUser, listMemberships } from "@/modules/identity/session";
import { getCompanyContext } from "@/modules/tenancy/repo";
import { authorize } from "@/modules/tenancy/authorize";
import { getGoldenCase, executeGoldenCase, tipoDeId } from "@/modules/goldens/service";
import { verifyGolden } from "@/modules/goldens/verify";
import { GOLDEN_TIPO_ES, GOLDEN_ORIGEN_ES, GOLDEN_ESTADO_ES, GOLDEN_ESTADO_VARIANT, es } from "@/modules/goldens/labels";
import { SignGoldenButton } from "./sign-button";

export const dynamic = "force-dynamic";

function kv(label: string, value: string) {
  return (
    <div className="grid grid-cols-[10rem_1fr] gap-2 border-b border-periwinkle-100 py-2 text-sm last:border-0">
      <dt className="text-periwinkle-500">{label}</dt>
      <dd className="break-words font-medium">{value || "—"}</dd>
    </div>
  );
}

export default async function DoradoDetallePage({ params }: { params: Promise<{ companyId: string; id: string }> }) {
  const { companyId, id } = await params;
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const ctx = await getCompanyContext(companyId, user.id);
  if (!ctx) redirect("/dashboard");
  const memberships = await listMemberships(user.id);
  const base = `/c/${companyId}`;

  const c = getGoldenCase(id);
  if (!c) redirect(`${base}/dorados`);
  const exec = executeGoldenCase(c);
  const verify = verifyGolden(c);
  const firmado = verify.firmado;
  const canSign = (await authorize(companyId, user.id, "goldens.sign")).ok;

  return (
    <div className="min-h-screen bg-white text-periwinkle-900 antialiased">
      <AppHeader
        title={`${c.id} · ${ctx.company?.razonSocial ?? "Empresa"}`}
        back={{ href: `${base}/dorados`, label: "Dorados" }}
        user={user}
        role={ctx.role}
        companyCount={memberships.length}
        branding={{ color: ctx.company?.colorDistintivo ?? null, logoUrl: ctx.company?.logoUrl ?? null }}
      />
      <main className="mx-auto max-w-4xl px-6 pb-16">
        <section className="relative overflow-hidden pt-10">
          <div className="relative">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="rounded-md px-3 py-1 font-mono">{c.id}</Badge>
              <Badge variant={GOLDEN_ESTADO_VARIANT[c.estado ?? ""] ?? "outline"}>{es(GOLDEN_ESTADO_ES, c.estado)}</Badge>
              <Badge variant="outline">{es(GOLDEN_TIPO_ES, tipoDeId(c.id))}</Badge>
              <Badge variant="outline">{es(GOLDEN_ORIGEN_ES, c.origen)}</Badge>
            </div>
            <h1 className="mt-3 text-balance text-3xl font-bold tracking-tight sm:text-4xl">{c.descripcion}</h1>
            {firmado ? (
              <p className="mt-2 flex items-start gap-1.5 text-sm text-periwinkle-500">
                <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#37c8a1]" aria-hidden />
                Firmado · sha256 {c.firma?.sha256_contenido ?? "—"}. El contenido no se edita: la corrección es una versión nueva.
              </p>
            ) : (
              <p className="mt-2 flex items-start gap-1.5 text-sm text-periwinkle-500">
                <Lock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                Sin firma verificable. La firma la emite el sistema con la sesión del contador (Opción 1, provisional).
              </p>
            )}
            {!firmado && canSign && (
              <div className="mt-4">
                <SignGoldenButton companyId={companyId} id={c.id} />
              </div>
            )}
          </div>
        </section>

        <section className="mt-8 grid gap-6" aria-label="Ficha de dorado">
          <Reveal>
            <Card className="overflow-hidden rounded-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-base tracking-tight">Caso</CardTitle>
                <CardDescription>Entradas del motor y esperado.</CardDescription>
              </CardHeader>
              <CardContent>
                <dl>
                  {kv("Documento", JSON.stringify(c.doc))}
                  {c.iva && kv("IVA", JSON.stringify(c.iva))}
                  {c.ivaEsperado && kv("IVA esperado", JSON.stringify(c.ivaEsperado))}
                  {c.islr && kv("ISLR", JSON.stringify(c.islr))}
                  {c.islrEsperado && kv("ISLR esperado", JSON.stringify(c.islrEsperado))}
                </dl>
              </CardContent>
            </Card>
          </Reveal>

          <Reveal>
            <Card className="overflow-hidden rounded-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-base tracking-tight">Ejecución contra el motor</CardTitle>
                <CardDescription>
                  {exec.pass ? "Reproduce el esperado." : `No reproduce: ${exec.diff ?? "—"}`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!exec.pass && (
                  <p className="mb-3 flex items-start gap-2 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
                    <Warning className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                    {exec.diff}
                  </p>
                )}
                <ul className="space-y-1 text-sm text-periwinkle-700">
                  {exec.explanation.map((line, i) => (
                    <li key={i} className="border-b border-periwinkle-50 py-1 font-mono text-xs">{line}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </Reveal>

          <Reveal>
            <Card className="overflow-hidden rounded-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-base tracking-tight">Firma</CardTitle>
              </CardHeader>
              <CardContent>
                <dl>
                  {kv("Firmado por", c.firma?.firmado_por ?? "")}
                  {kv("Usuario", c.firma?.firmado_por_user_id ?? "")}
                  {kv("Cédula / RIF", c.firma?.firmante_doc ?? "")}
                  {kv("Fecha", c.firma?.fecha ?? "")}
                  {kv("Firmado en", c.firma?.firmado_en ?? "")}
                  {kv("Fuente legal", c.firma?.fuente_legal ?? "")}
                  {kv("Algoritmo", c.firma?.algoritmo ?? "")}
                  {kv("Clave", c.firma?.key_id ?? "")}
                  {kv("sha256_contenido", c.firma?.sha256_contenido ?? "")}
                  {kv("Verificación", firmado ? "Firma válida" : (verify.error ?? "Sin firma"))}
                </dl>
              </CardContent>
            </Card>
          </Reveal>
        </section>

        <div className="mt-8">
          <Link href={`${base}/dorados`} className="inline-flex items-center gap-1.5 rounded-md text-sm text-periwinkle-500 transition-colors hover:text-[#120c27]">
            <ArrowBack className="h-4 w-4" aria-hidden /> Volver a dorados
          </Link>
        </div>
      </main>
      <PageFooter context={ctx.company?.razonSocial ?? "Empresa"} />
    </div>
  );
}
