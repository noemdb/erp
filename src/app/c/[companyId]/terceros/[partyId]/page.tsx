import Link from "next/link";
import { redirect } from "next/navigation";
import ArrowBack from "@mui/icons-material/ArrowBack";
import History from "@mui/icons-material/History";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
import { listAuditEvents } from "@/modules/audit/queries";
import { getPartyWithProfiles } from "@/modules/parties/service";
import { EditPartyForm } from "./edit-party-form";
import { ProfileDialog } from "./profile-dialog";

function fmtDate(iso: string): string {
  const d = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso.trim());
  return d ? `${d[3]}-${d[2]}-${d[1]}` : iso.trim();
}

function fmtRange(range: string): string {
  const m = /^\[(.*?),(.*?)\)$/.exec(range);
  if (!m) return range;
  const from = fmtDate(m[1] ?? "");
  const to = (m[2] ?? "").trim();
  return to === "" ? `${from} → vigente` : `${from} → ${fmtDate(to)}`;
}

function fmtDateTime(v: unknown): string {
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

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "T";
}

export default async function TerceroDetallePage({
  params,
}: {
  params: Promise<{ companyId: string; partyId: string }>;
}) {
  const { companyId, partyId } = await params;
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const ctx = await getCompanyContext(companyId, user.id);
  if (!ctx) redirect("/dashboard");
  const memberships = await listMemberships(user.id);
  const base = `/c/${companyId}`;

  const c = { companyId, userId: user.id };
  const data = await getPartyWithProfiles(c, partyId);
  if (!data) redirect(`${base}/terceros`);
  const { party, profiles } = data;
  const events = await listAuditEvents(c, { entityType: "party", entityId: partyId });
  const canEdit = (await authorize(companyId, user.id, "docs.create")).ok;
  const active = party.status === "active";

  return (
    <div className="min-h-screen bg-white text-periwinkle-900 antialiased">
      <AppHeader
        title={`Terceros · ${ctx.company?.razonSocial ?? "Empresa"}`}
        back={{ href: `${base}/terceros`, label: "Terceros" }}
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
          <div className="relative flex items-start gap-4">
            {canEdit && active && (
              <div className="mt-4 shrink-0 sm:absolute sm:right-0 sm:top-0 sm:mt-0">
                <ProfileDialog companyId={companyId} partyId={partyId} />
              </div>
            )}
            <Avatar className="h-14 w-14 shrink-0 text-lg">
              <AvatarFallback>{initials(party.razonSocial)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <Badge variant="outline" className="rounded-md px-3 py-1">
                Tercero · {party.rifOriginal}
              </Badge>
              <h1 className="mt-3 text-balance text-3xl font-bold tracking-tight sm:text-4xl">
                {party.razonSocial}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge variant={active ? "success" : "muted"}>
                  {active ? "Activo" : (party.status ?? "—")}
                </Badge>
                {!active && (
                  <span className="text-xs text-periwinkle-500">
                    Inactivo: no admite documentos nuevos.
                  </span>
                )}
              </div>
            </div>
          </div>
        </section>

        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          {/* Datos base */}
          <Reveal className="h-full">
            <Card className="h-full rounded-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-base tracking-tight">
                  Datos base
                </CardTitle>
                <CardDescription>
                  El RIF identifica al tercero y no se edita.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <dl className="divide-y divide-periwinkle-100 text-sm">
                  <div className="flex items-center justify-between gap-4 py-2.5">
                    <dt className="text-periwinkle-500">RIF</dt>
                    <dd className="font-mono" title={`Normalizado: ${party.rif}`}>
                      {party.rifOriginal}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-4 py-2.5">
                    <dt className="text-periwinkle-500">RIF normalizado</dt>
                    <dd className="font-mono text-xs text-periwinkle-500">
                      {party.rif}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-4 py-2.5">
                    <dt className="text-periwinkle-500">Dirección fiscal</dt>
                    <dd
                      className="max-w-56 truncate"
                      title={party.direccionFiscal ?? ""}
                    >
                      {party.direccionFiscal ?? "—"}
                    </dd>
                  </div>
                </dl>
                {canEdit && active && (
                  <div className="mt-4 border-t border-periwinkle-100 pt-4">
                    <EditPartyForm
                      companyId={companyId}
                      rif={party.rifOriginal}
                      razonSocial={party.razonSocial}
                      direccionFiscal={party.direccionFiscal}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </Reveal>

          {/* Historial fiscal */}
          <Reveal className="h-full" delay={80}>
            <Card className="h-full rounded-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-base tracking-tight">
                  Historial fiscal
                </CardTitle>
                <CardDescription>
                  {profiles.length === 0
                    ? "Sin perfil fiscal: las retenciones necesitan uno para aplicar."
                    : `${profiles.length} ${profiles.length === 1 ? "vigencia" : "vigencias"}; los cambios agregan, nunca sobrescriben.`}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {profiles.length === 0 ? (
                  <p className="px-5 pb-5 text-sm text-periwinkle-500">
                    Registra el primer perfil abajo con su fecha de vigencia.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[28rem] text-sm">
                      <thead>
                        <tr className="border-y border-periwinkle-200 bg-periwinkle-50/70 text-left text-[11px] font-semibold uppercase tracking-wider text-periwinkle-500">
                          <th scope="col" className="px-4 py-3">Vigencia</th>
                          <th scope="col" className="px-4 py-3">Tipo</th>
                          <th scope="col" className="px-4 py-3">Ret. IVA</th>
                          <th scope="col" className="px-4 py-3">Ret. ISLR</th>
                        </tr>
                      </thead>
                      <tbody>
                        {profiles.map((p) => (
                          <tr
                            key={p.id}
                            className="border-b border-periwinkle-100 last:border-0"
                          >
                            <td className="whitespace-nowrap px-4 py-3 font-mono text-xs tabular-nums">
                              {fmtRange(p.effectiveRange)}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3">
                              {p.tipoPersona === "natural" ? "Natural" : "Jurídica"}
                              {p.residente ? "" : " · no residente"}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3">
                              <Badge variant={p.sujetoRetencionIva ? "success" : "muted"}>
                                {p.sujetoRetencionIva ? "Sí" : "No"}
                              </Badge>
                            </td>
                            <td className="whitespace-nowrap px-4 py-3">
                              <Badge variant={p.sujetoRetencionIslr ? "success" : "muted"}>
                                {p.sujetoRetencionIslr ? "Sí" : "No"}
                              </Badge>
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
        </div>

        {/* Bitácora */}
        <section className="mt-4" aria-label="Bitácora">
          <Reveal>
            <Card className="rounded-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-base tracking-tight">
                  Bitácora
                </CardTitle>
                <CardDescription>
                  Quién y cuándo cambió este tercero.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {events.length === 0 ? (
                  <p className="flex items-start gap-2 text-sm text-periwinkle-500">
                    <History className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                    Sin eventos registrados.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {events.slice(0, 10).map((e) => (
                      <li
                        key={e.id}
                        className="flex items-start justify-between gap-3 rounded-md border border-periwinkle-100 px-3 py-2.5 text-sm"
                      >
                        <div className="min-w-0">
                          <p className="font-medium">{e.action}</p>
                          {e.reason && (
                            <p className="truncate text-xs text-periwinkle-500" title={e.reason}>
                              {e.reason}
                            </p>
                          )}
                        </div>
                        <span className="shrink-0 font-mono text-xs tabular-nums text-periwinkle-500">
                          {fmtDateTime(e.occurredAt)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </Reveal>
        </section>

        <div className="mt-8">
          <Link
            href={`${base}/terceros`}
            className="inline-flex items-center gap-1.5 rounded-md text-sm text-periwinkle-500 transition-colors hover:text-[#120c27]"
          >
            <ArrowBack className="h-4 w-4" aria-hidden />
            Volver a terceros
          </Link>
        </div>
      </main>

      <PageFooter context={ctx.company?.razonSocial ?? "Empresa"} />
    </div>
  );
}
