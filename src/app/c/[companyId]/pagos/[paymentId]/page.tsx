import Link from "next/link";
import { redirect } from "next/navigation";
import Decimal from "decimal.js";
import AccountBalance from "@mui/icons-material/AccountBalance";
import Approval from "@mui/icons-material/Approval";
import ArrowBack from "@mui/icons-material/ArrowBack";
import History from "@mui/icons-material/History";
import Payments from "@mui/icons-material/Payments";
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
import { getSettlementEventDetail, listOpenPurchases } from "@/modules/payments/service";
import { AllocateForm } from "./allocate-form";

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

const METHOD_LABELS: Record<string, string> = {
  transferencia: "Transferencia bancaria",
  "pago movil": "Pago móvil",
  efectivo: "Efectivo",
  cheque: "Cheque",
  tarjeta: "Tarjeta (punto de venta)",
  deposito: "Depósito bancario",
};

export default async function PagoDetallePage({ params }: { params: Promise<{ companyId: string; paymentId: string }> }) {
  const { companyId, paymentId } = await params;
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const ctx = await getCompanyContext(companyId, user.id);
  if (!ctx) redirect("/dashboard");
  const memberships = await listMemberships(user.id);
  const base = `/c/${companyId}`;
  const c = { companyId, userId: user.id };

  const detail = await getSettlementEventDetail(c, paymentId);
  if (!detail) redirect(`${base}/pagos`);
  const { event, party, allocations } = detail;
  const purchases = await listOpenPurchases(c);

  const isAbono = event.eventType !== "payment";
  const allocated = allocations.reduce((a, l) => { try { return a.plus(l.amountAllocated || 0); } catch { return a; } }, new Decimal(0));
  const available = new Decimal(event.amount || 0).minus(allocated);

  const kpis = [
    { label: "Monto del evento", value: fmtMonto(event.amount) },
    { label: "Asignado", value: fmtMonto(allocated.toFixed(2)) },
    { label: "Disponible", value: fmtMonto(available.toFixed(2)), highlight: true },
  ];

  return (
    <div className="min-h-screen bg-white text-periwinkle-900 antialiased">
      <AppHeader
        title={`${isAbono ? "Abono" : "Pago"} · ${ctx.company?.razonSocial ?? "Empresa"}`}
        back={{ href: `${base}/pagos`, label: "Pagos" }}
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
                Evento de liquidación · {isAbono ? "Abono en cuenta" : "Pago"}
              </Badge>
              <h1 className="mt-3 font-mono text-balance text-3xl font-bold tracking-tight tabular-nums sm:text-4xl">
                {fmtMonto(event.amount)}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge variant={event.status === "active" ? "success" : "muted"}>
                  {event.status === "active" ? "Activo" : (event.status ?? "—")}
                </Badge>
                {event.inferred && <Badge variant="warning">Dato inferido</Badge>}
                <span className="text-sm text-periwinkle-500">
                  {fmtFecha(event.eventDate)} · {party?.razonSocial ?? "—"}{" "}
                  <span className="font-mono">({party?.rifOriginal ?? "—"})</span>
                </span>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Button asChild variant="outline">
                <Link href={`${base}/retenciones-islr/nueva`}>
                  <Approval aria-hidden />
                  Retención ISLR
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* KPIs */}
        <section className="mt-8" aria-label="Montos del evento">
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
                  <AccountBalance className="h-4 w-4 text-periwinkle-500" aria-hidden />
                  Ficha del evento
                </CardTitle>
                <CardDescription>
                  Hecho económico registrado; no emite retención por sí solo.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <dl className="divide-y divide-periwinkle-100 text-sm">
                  <div className="flex items-center justify-between gap-4 py-2.5">
                    <dt className="text-periwinkle-500">Tipo</dt>
                    <dd>
                      <Badge variant={isAbono ? "secondary" : "default"}>
                        {isAbono ? "Abono en cuenta" : "Pago"}
                      </Badge>
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-4 py-2.5">
                    <dt className="text-periwinkle-500">Beneficiario</dt>
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
                    <dt className="text-periwinkle-500">Fecha efectiva</dt>
                    <dd className="font-mono tabular-nums">{fmtFecha(event.eventDate)}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-4 py-2.5">
                    <dt className="text-periwinkle-500">Monto</dt>
                    <dd className="font-mono font-semibold tabular-nums">{fmtMonto(event.amount)} {event.currency ?? "VES"}</dd>
                  </div>
                  {!isAbono && (
                    <div className="flex items-center justify-between gap-4 py-2.5">
                      <dt className="text-periwinkle-500">Método</dt>
                      <dd>{(event.method && (METHOD_LABELS[event.method] ?? event.method)) || "Sin especificar"}</dd>
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-4 py-2.5">
                    <dt className="text-periwinkle-500">Referencia</dt>
                    <dd className="max-w-60 truncate text-right" title={event.sourceRef ?? ""}>
                      {event.sourceRef ?? "—"}
                    </dd>
                  </div>
                  {event.inferred && (
                    <div className="flex items-center justify-between gap-4 py-2.5">
                      <dt className="text-periwinkle-500">Origen del dato</dt>
                      <dd><Badge variant="warning">Inferido (auditado)</Badge></dd>
                    </div>
                  )}
                </dl>
              </CardContent>
            </Card>
          </Reveal>

          {/* Asignaciones */}
          <Reveal className="h-full" delay={80}>
            <Card className="h-full rounded-lg">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base tracking-tight">
                  <History className="h-4 w-4 text-periwinkle-500" aria-hidden />
                  Asignaciones ({allocations.length})
                </CardTitle>
                <CardDescription>
                  A qué compras se aplicó este evento. La suma no puede exceder el evento ni el total de cada compra.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {allocations.length === 0 ? (
                  <p className="rounded-md bg-periwinkle-50 px-3 py-2.5 text-sm text-periwinkle-500">
                    Sin asignaciones todavía. Usa el formulario de abajo para
                    asignar a una compra validada del mismo proveedor.
                  </p>
                ) : (
                  <ul className="divide-y divide-periwinkle-100">
                    {allocations.map((a) => (
                      <li key={a.id} className="flex items-center justify-between gap-4 py-2.5 text-sm">
                        <span>
                          {a.docId ? (
                            <Link
                              href={`${base}/compras/${a.docId}`}
                              className="font-medium text-[#352574] underline decoration-periwinkle-300 underline-offset-2 hover:text-[#120c27]"
                            >
                              {a.docNumber}
                            </Link>
                          ) : (
                            <span className="font-medium">{a.docNumber}</span>
                          )}
                          <span className="block font-mono text-xs tabular-nums text-periwinkle-500">
                            total compra {fmtMonto(a.docTotal)}
                          </span>
                        </span>
                        <span className="font-mono font-semibold tabular-nums">
                          {fmtMonto(a.amountAllocated)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </Reveal>
        </div>

        {/* Asignar */}
        <section className="mt-8" aria-label="Asignar evento a compra">
          <Reveal>
            <Card className="overflow-hidden rounded-lg">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base tracking-tight">
                  <Payments className="h-4 w-4 text-periwinkle-500" aria-hidden />
                  Asignar a compra
                </CardTitle>
                <CardDescription>
                  Disponible {fmtMonto(available.toFixed(2))}. Asignar no emite
                  retención; habilita la emisión ISLR bajo el criterio G2.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {event.status !== "active" ? (
                  <p className="rounded-md bg-periwinkle-50 px-3 py-2.5 text-sm text-periwinkle-500">
                    Evento anulado: no admite nuevas asignaciones.
                  </p>
                ) : available.lte(0) ? (
                  <p className="rounded-md bg-periwinkle-50 px-3 py-2.5 text-sm text-periwinkle-500">
                    Evento totalmente asignado. Para corregir, anula con trazabilidad.
                  </p>
                ) : (
                  <AllocateForm
                    companyId={companyId}
                    eventId={paymentId}
                    eventPartyId={event.partyId}
                    available={available.toFixed(2)}
                    purchases={purchases}
                  />
                )}
              </CardContent>
            </Card>
          </Reveal>
        </section>

        <div className="mt-8">
          <Link
            href={`${base}/pagos`}
            className="inline-flex items-center gap-1.5 rounded-md text-sm text-periwinkle-500 transition-colors hover:text-[#120c27]"
          >
            <ArrowBack className="h-4 w-4" aria-hidden />
            Volver a pagos
          </Link>
        </div>
      </main>

      <PageFooter context={ctx.company?.razonSocial ?? "Empresa"} />
    </div>
  );
}
