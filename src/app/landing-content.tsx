import Link from "next/link";
import ArrowForward from "@mui/icons-material/ArrowForward";
import ArrowUpward from "@mui/icons-material/ArrowUpward";
import Close from "@mui/icons-material/Close";
import FactCheck from "@mui/icons-material/FactCheck";
import Business from "@mui/icons-material/Business";
import Calculate from "@mui/icons-material/Calculate";
import AssignmentTurnedIn from "@mui/icons-material/AssignmentTurnedIn";
import CheckCircle from "@mui/icons-material/CheckCircle";
import Description from "@mui/icons-material/Description";
import Fingerprint from "@mui/icons-material/Fingerprint";
import AccountBalance from "@mui/icons-material/AccountBalance";
import Lock from "@mui/icons-material/Lock";
import FindInPage from "@mui/icons-material/FindInPage";
import VerifiedUser from "@mui/icons-material/VerifiedUser";
import Approval from "@mui/icons-material/Approval";
import CloudUpload from "@mui/icons-material/CloudUpload";
import Group from "@mui/icons-material/Group";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Badge,
} from "@/components/ui/card";
import { Reveal } from "@/components/ui/reveal";
import { cn } from "@/lib/utils";

type LandingContentProps = {
  userName?: string | null;
};

const principles = [
  {
    icon: Business,
    title: "Aislamiento multiempresa",
    text: "Cada empresa está aislada: ningún dato cruza empresas y el aislamiento se cumple en la aplicación y en la base de datos.",
  },
  {
    icon: Lock,
    title: "Inmutabilidad fiscal",
    text: "Lo emitido o cerrado no se edita: se anula, se sustituye con un documento que lo reemplaza o se ajusta hacia un período abierto.",
  },
  {
    icon: Fingerprint,
    title: "Reproducibilidad",
    text: "Todo reporte cerrado se regenera idéntico: copia fiel de los datos más huella digital (hash) en el acta de cierre del período.",
  },
  {
    icon: FindInPage,
    title: "Trazabilidad completa",
    text: "De cada total al documento fiscal, a la fila del CSV y al archivo de origen, en 3 clics o menos.",
  },
];

const bento = [
  {
    icon: Calculate,
    title: "Motor versionado",
    text: "Cada cálculo propone alícuota y porcentaje vigentes a la fecha fiscal y muestra la regla aplicada con su justificación. Nada se activa sin tu matriz firmada.",
    badge: "Preview con explanation[]",
    wide: true,
    chips: ["Fecha fiscal manda", "Regla con vigencia"],
  },
  {
    icon: FindInPage,
    title: "Trazabilidad completa",
    text: "Libro de Compras, Libro de Ventas y Resumen de IVA se derivan de los documentos. Cada cifra se desglosa hasta la factura, la retención y la línea del archivo de origen.",
    badge: "Desglose por documento",
  },
  {
    icon: Approval,
    title: "Numeración IVA sin huecos",
    text: "Correlativo único IVA por empresa y período, reservado en la misma transacción de emisión. Un fallo no consume número; lo anulado no se reutiliza. Formato ISLR pendiente de tu definición (G9).",
    badge: "N° ejemplo — cifras ficticias",
  },
  {
    icon: VerifiedUser,
    title: "Cierre congelado",
    text: "El período cerrado no admite movimientos. Solo se reabre con motivo y responsable.",
    badge: "Acta de cierre",
    full: true,
    dark: true,
    flow: ["Lista de verificación", "Congelamiento", "Reportes firmados", "Acta + huella"],
  },
];

const steps = [
  {
    n: "01",
    title: "El asistente registra una vez",
    text: "El sistema captura compra, venta, nota de crédito, nota de débito, reporte Z o pago —manual o desde el CSV del sistema anterior— con revisión por lotes. Pensado para 100–200 documentos/mes.",
    wide: true,
    chips: ["Factura", "NC · ND", "Reporte Z", "Pago"],
  },
  {
    n: "02",
    title: "Revisas con regla vigente",
    text: "El motor propone alícuota y porcentaje por vigencia y te muestra la justificación antes de emitir. Sin matriz firmada no hay regla definitiva.",
    wide: true,
    chips: ["Preview", "Regla con vigencia"],
  },
  {
    n: "03",
    title: "Tú emites el comprobante",
    text: "Comprobante de IVA multi-factura (ISLR con serie provisional hasta G9): número en transacción + snapshot inmutable + auditoría; el PDF se genera tras confirmar, con reintentos. Nunca se edita: se anula o sustituye.",
    wide: true,
    dark: true,
    mono: "Ejemplo ficticio N° 202609-000128 · 3 facturas · 7.344,00",
  },
  {
    n: "04",
    title: "Deriva libros y resumen",
    text: "Libro de Compras, Libro de Ventas, Resumen de IVA y conciliación (objetivo tolerancia 0; provisional 0,01 hasta que definas redondeo G8). Sin transcripción a Excel.",
  },
  {
    n: "05",
    title: "Tú cierras con acta",
    text: "El período fiscal se congela con acta de cierre y huella digital sobre documentos y reportes. Reapertura solo con motivo y responsable.",
  },
];

const roles = [
  {
    icon: AssignmentTurnedIn,
    rol: "Contador (tú)",
    text: "Revisas el preview con justificación visible, emites comprobantes y firmas el cierre. Solo tú cambias criterio G2 y activas reglas.",
  },
  {
    icon: CloudUpload,
    rol: "Asistente automático (el sistema)",
    text: "Prepara por ti: registra una vez, deriva libros de compra/venta, propone retenciones con justificación y arma el resumen como insumo para tu declaración. No firma: deja todo listo para tu revisión.",
  },
  {
    icon: FindInPage,
    rol: "Auditor",
    text: "Solo lectura: traza total → documento fiscal → fila del CSV → archivo. Lee la bitácora inalterable.",
  },
  {
    icon: Group,
    rol: "Admin sistema",
    text: "Usuarios, empresas, sucursales y permisos rol × empresa. Sesiones revocables en base de datos.",
  },
];

const facturasAfectadas = [
  { n: "F-001021", fecha: "08-2026", base: "24.500,00", ret: "2.940,00" },
  { n: "F-001034", fecha: "09-2026", base: "21.300,00", ret: "2.556,00" },
  { n: "F-001047", fecha: "09-2026", base: "15.400,00", ret: "1.848,00" },
];

export function LandingContent({ userName }: LandingContentProps) {
  return (
    <div id="top" className="min-h-screen bg-white text-periwinkle-900 antialiased">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-periwinkle-200/70 bg-white/85 shadow-[0_1px_0_rgba(15,43,70,0.04)] backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link
            href="/"
            className="group flex items-center gap-2.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-[#37c8a1]"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-gradient-to-br from-[#120c27] to-[#352574] text-white shadow-md shadow-[#120c27]/20 ring-1 ring-[#120c27]/10 transition-transform duration-300 group-hover:scale-105">
              <AccountBalance className="h-5 w-5" aria-hidden />
            </span>
            <span className="text-sm font-semibold leading-tight tracking-tight">
              ERP-TributarioLite
              <span className="block text-xs font-normal text-periwinkle-500">
                Fuente única de verdad fiscal
              </span>
            </span>
          </Link>
          <nav
            className="hidden items-center gap-0.5 text-sm md:flex"
            aria-label="Secciones"
          >
            {[
              ["Motor", "#motor"],
              ["Recorrido", "#recorrido"],
              ["Roles", "#roles"],
              ["Alcance", "#alcance"],
              ["Prueba", "#prueba"],
            ].map(([label, href]) => (
              <a
                key={href}
                href={href}
                className="rounded-md px-3 py-2 text-periwinkle-600 transition-colors hover:bg-periwinkle-100 hover:text-[#120c27]"
              >
                {label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            {userName ? (
              <>
                <span className="hidden text-sm text-periwinkle-600 sm:inline">
                  Hola, {userName}
                </span>
                <Button
                  asChild
                  className="group rounded-md px-5 shadow-md shadow-[#120c27]/20"
                >
                  <Link href="/dashboard">Ir al dashboard</Link>
                </Button>
              </>
            ) : (
              <Button
                asChild
                className="group rounded-md px-5 shadow-md shadow-[#120c27]/20 [&_svg]:transition-transform [&_svg]:duration-200 group-hover:[&_svg]:translate-x-0.5"
              >
                <Link href="/login">
                  Entrar al sistema <ArrowForward aria-hidden />
                </Link>
              </Button>
            )}
          </div>
        </div>
        {/* Acento fiscal degradado */}
        <div
          className="h-0.5 bg-gradient-to-r from-[#120c27] via-[#352574] to-[#37c8a1]"
          aria-hidden
        />
      </header>

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div
            className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:44px_44px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_35%,black,transparent)]"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -top-32 left-1/2 h-96 w-[60rem] -translate-x-1/2 rounded-full bg-gradient-to-r from-[#37c8a1]/15 via-[#352574]/10 to-[#120c27]/10 blur-3xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -left-40 top-64 h-72 w-72 rounded-full bg-icy-aqua-100/70 blur-3xl"
            aria-hidden
          />
          <div className="relative mx-auto grid max-w-6xl gap-12 px-6 pb-16 pt-14 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:pt-20">
            <div className="animate-fade-up">
              <Badge
                variant="secondary"
                className="rounded-md border border-icy-aqua-200 bg-icy-aqua-50/90 px-3 py-1 text-[#120c27] shadow-sm"
              >
                <span
                  className="h-1.5 w-1.5 rounded-full bg-icy-aqua-500"
                  aria-hidden
                />
                IVA · ISLR · Multiempresa — Venezuela
              </Badge>
              <h1 className="mt-5 text-balance text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl">
                Tu asistente auxiliar,{" "}
                <span className="bg-gradient-to-r from-[#120c27] via-[#352574] to-[#37c8a1] bg-clip-text text-transparent">
                  tú firmas el cierre
                </span>
              </h1>
              <p className="mt-5 max-w-xl text-pretty text-base leading-relaxed text-periwinkle-600 sm:text-lg">
                Para contadores: el sistema actúa como tu asistente auxiliar.
                Simplifica tus procesos —Libro de Compras, Libro de Ventas,
                retenciones y resumen como insumo para tu declaración—
                cargando una sola vez con justificación visible. Tú revisas,
                emites y cierras con acta. Si no cuadra con tu Excel, el mes
                no se cierra.
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                {userName ? (
                  <>
                    <Button
                      size="lg"
                      asChild
                      className="rounded-md px-7 shadow-lg shadow-[#120c27]/25 transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]"
                    >
                      <Link href="/dashboard">
                        Continuar <ArrowForward aria-hidden />
                      </Link>
                    </Button>
                    <span className="text-sm text-periwinkle-600">
                      Hola, {userName}
                    </span>
                  </>
                ) : (
                  <>
                    <Button
                      size="lg"
                      asChild
                      className="rounded-md px-7 shadow-lg shadow-[#120c27]/25 transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]"
                    >
                      <Link href="/login">
                        Entrar al sistema <ArrowForward aria-hidden />
                      </Link>
                    </Button>
                  </>
                )}
              </div>
              <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-periwinkle-500">
                <span className="inline-flex items-center gap-1.5">
                  <VerifiedUser
                    className="h-3.5 w-3.5 text-icy-aqua-600"
                    aria-hidden
                  />
                  Preview con justificación visible
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-periwinkle-400" aria-hidden />
                  Datos aislados por empresa
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Fingerprint
                    className="h-3.5 w-3.5 text-periwinkle-400"
                    aria-hidden
                  />
                  Cierre con huella digital
                </span>
              </div>
              <dl className="mt-6 grid max-w-lg grid-cols-3 gap-3 text-sm">
                {[
                  ["Diseñado para", "100–200 docs/mes"],
                  ["Trazabilidad", "total → archivo"],
                  ["Estado", "En validación piloto"],
                ].map(([dt, dd]) => (
                  <div
                    key={dt}
                    className="rounded-lg border border-periwinkle-200/80 bg-white/80 px-4 py-3 shadow-sm backdrop-blur"
                  >
                    <dt className="text-xs text-periwinkle-500">{dt}</dt>
                    <dd className="mt-0.5 text-lg font-semibold tracking-tight">
                      {dd}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>

            {/* Mock panel fiscal */}
            <div className="relative animate-fade-up [animation-delay:120ms]">
              <div
                className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-icy-aqua-100 via-white to-transparent blur-2xl"
                aria-hidden
              />
              <div
                className="absolute inset-x-8 top-5 bottom-1 rotate-[1.5deg] rounded-lg border border-periwinkle-200/70 bg-white/70 shadow-md"
                aria-hidden
              />
              <Card className="relative overflow-hidden rounded-lg border-periwinkle-200 bg-white/95 shadow-xl shadow-periwinkle-200/60 ring-1 ring-[#120c27]/5 backdrop-blur">
                <div
                  className="h-1 bg-gradient-to-r from-[#120c27] via-[#352574] to-[#37c8a1]"
                  aria-hidden
                />
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-md bg-[#120c27] text-white shadow-md shadow-[#120c27]/20">
                      <Approval className="h-5 w-5" aria-hidden />
                    </span>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-icy-aqua-700">
                        Comprobante de retención · IVA · ejemplo ficticio
                      </p>
                      <CardTitle className="mt-0.5 font-mono text-base tracking-tight">
                        N° 202609-000128
                      </CardTitle>
                      <CardDescription>
                        Período 2026-09 · segunda quincena · cifras ilustrativas
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant="success" className="gap-1 shadow-sm">
                      <VerifiedUser className="h-3 w-3" aria-hidden />
                      emitido
                    </Badge>
                    <span className="text-[11px] tabular-nums text-periwinkle-400">
                      30-09-2026
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <div className="flex items-center gap-2.5 rounded-md border border-periwinkle-100 bg-periwinkle-50 px-3 py-2.5">
                    <Business
                      className="h-4 w-4 shrink-0 text-periwinkle-400"
                      aria-hidden
                    />
                    <p className="truncate text-periwinkle-500">
                      Agente:{" "}
                      <span className="font-medium text-periwinkle-800">
                        Comercial Andina, C.A.
                      </span>{" "}
                      · RIF J-31245897-4
                    </p>
                  </div>
                  <div>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="font-semibold uppercase tracking-wider text-periwinkle-400">
                        Facturas afectadas
                      </span>
                      <span className="tabular-nums text-periwinkle-400">3</span>
                    </div>
                    <ul className="divide-y divide-periwinkle-100">
                      {facturasAfectadas.map((f) => (
                        <li
                          key={f.n}
                          className="flex items-baseline justify-between gap-3 py-2"
                        >
                          <span className="truncate text-periwinkle-600">
                            <span className="font-mono">{f.n}</span>{" "}
                            <span className="text-periwinkle-400">· {f.fecha}</span>
                          </span>
                          <span className="shrink-0 tabular-nums text-periwinkle-500">
                            base {f.base}{" "}
                            <span className="mx-0.5 text-periwinkle-300">|</span>{" "}
                            <span className="font-semibold text-periwinkle-800">
                              ret. {f.ret}
                            </span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-md bg-gradient-to-r from-[#120c27] to-[#352574] px-4 py-3 text-white shadow-md shadow-[#120c27]/20">
                    <div className="flex items-baseline justify-between text-[13px] text-periwinkle-300">
                      <span>Base imponible · IVA ejemplo</span>
                      <span className="tabular-nums">61.200,00 · 9.792,00</span>
                    </div>
                    <div className="mt-1.5 flex items-baseline justify-between border-t border-white/15 pt-1.5">
                      <span className="font-medium">IVA retenido · ejemplo</span>
                      <span className="font-mono text-base font-semibold tabular-nums">
                        7.344,00
                      </span>
                    </div>
                  </div>
                  <div className="border-t border-dashed border-periwinkle-200 pt-3">
                    <div className="flex items-center justify-between text-xs text-periwinkle-500">
                      <span className="inline-flex items-center gap-1.5">
                        <Fingerprint
                          className="h-3.5 w-3.5 text-[#352574]"
                          aria-hidden
                        />
                        Huella verificada
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Description
                          className="h-3.5 w-3.5"
                          aria-hidden
                        />
                        PDF · Excel
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <div
                className="absolute -top-3 right-10 rotate-[6deg] rounded-md border-2 border-icy-aqua-600/60 bg-white/95 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.25em] text-icy-aqua-700 shadow-md animate-float"
                aria-hidden
              >
                Emitido
              </div>
              <Badge className="absolute -bottom-4 left-6 rotate-[-3deg] gap-1.5 py-1.5 pl-2.5 pr-3 shadow-lg animate-float">
                <Approval className="h-3.5 w-3.5" aria-hidden />
                Comprobante de IVA · ejemplo sin valor fiscal
              </Badge>
              <Badge
                variant="secondary"
                className="absolute -right-2 bottom-10 rotate-[3deg] gap-1.5 border border-icy-aqua-200 bg-white/95 py-1.5 pl-2.5 pr-3 shadow-lg backdrop-blur animate-float [animation-delay:1.2s]"
              >
                <Fingerprint
                  className="h-3.5 w-3.5 text-[#352574]"
                  aria-hidden
                />
                Acta de cierre · período congelado
              </Badge>
            </div>
          </div>
        </section>

        {/* Bento */}
        <section
          id="motor"
          className="mx-auto max-w-6xl scroll-mt-20 px-6 py-14"
        >
          <Badge variant="outline" className="rounded-md px-3 py-1">
            Motor + garantías
          </Badge>
          <h2 className="mt-3 max-w-2xl text-balance text-3xl font-bold tracking-tight">
            Tú firmas cada cifra: el auxiliar propone, el motor deja constancia
          </h2>
          <p className="mt-3 max-w-2xl text-pretty text-periwinkle-600">
            Cuatro garantías técnicas — probadas en desarrollo, pendientes de
            tu validación en mes piloto — del documento de origen al cierre.
          </p>
          <div className="mt-8 grid gap-3 rounded-lg border border-periwinkle-200 bg-periwinkle-50 p-3 sm:grid-cols-2 lg:grid-cols-4">
            {bento.map((b, i) => (
              <Reveal
                key={b.title}
                delay={(i % 4) * 80}
                className={cn(
                  "h-full",
                  b.dark
                    ? "sm:col-span-2 lg:col-span-4"
                    : b.wide && "sm:col-span-2"
                )}
              >
              <article
                className={cn(
                  "flex h-full flex-col rounded-md p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md",
                  b.dark
                    ? "bg-gradient-to-br from-[#120c27] to-[#352574] text-white shadow-md shadow-[#120c27]/20"
                    : "border border-periwinkle-200 bg-white"
                )}
              >
                <div
                  className={cn(
                    "flex gap-3",
                    b.full ? "flex-col lg:flex-row lg:items-center lg:gap-6" : "flex-col"
                  )}
                >
                  <div className={cn(b.full && "min-w-0 flex-1")}>
                    <div className="flex items-center gap-3">
                      <span
                        className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-md shadow-sm",
                          b.dark
                            ? "bg-white/15 text-white"
                            : "bg-icy-aqua-100 text-[#120c27]"
                        )}
                      >
                        <b.icon className="h-4.5 w-4.5" aria-hidden />
                      </span>
                      <div>
                        <p className="font-semibold tracking-tight">{b.title}</p>
                        <p
                          className={cn(
                            "mt-0.5 font-mono text-[11px]",
                            b.dark ? "text-periwinkle-200" : "text-periwinkle-500"
                          )}
                        >
                          {b.badge}
                        </p>
                      </div>
                    </div>
                    <p
                      className={cn(
                        "mt-3 text-sm leading-relaxed",
                        b.dark ? "text-periwinkle-200" : "text-periwinkle-600"
                      )}
                    >
                      {b.text}
                    </p>
                    {b.chips && (
                      <div className="mt-4 flex flex-wrap gap-1.5">
                        {b.chips.map((c) => (
                          <span
                            key={c}
                            className="rounded-md bg-periwinkle-100 px-2.5 py-1 text-[11px] font-medium text-periwinkle-700"
                          >
                            {c}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  {b.flow && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      {b.flow.map((f, i) => (
                        <span key={f} className="flex items-center gap-1.5">
                          {i > 0 && (
                            <ArrowForward
                              className="h-3 w-3 shrink-0 text-white/50"
                              aria-hidden
                            />
                          )}
                          <span className="rounded-md bg-white/10 px-2.5 py-1 text-[11px] font-medium text-white">
                            {f}
                          </span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </article>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Principios */}
        <section className="relative overflow-hidden border-y border-[#120c27]/10 bg-gradient-to-b from-periwinkle-50 to-icy-aqua-50/60">
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-icy-aqua-300 to-transparent"
            aria-hidden
          />
          <div className="mx-auto max-w-6xl px-6 py-14">
            <Badge variant="outline" className="rounded-md bg-white px-3 py-1">
              Principios de diseño
            </Badge>
            <h2 className="mt-3 max-w-2xl text-balance text-2xl font-bold tracking-tight">
              Cuatro propiedades en orden de prioridad ante un conflicto
            </h2>
            <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {principles.map((p, i) => (
                <Card
                  key={p.title}
                  className="group rounded-lg bg-white/90 backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                >
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <span className="flex h-9 w-9 items-center justify-center rounded-md bg-[#120c27] text-white shadow-md shadow-[#120c27]/20 transition-transform duration-300 group-hover:scale-105">
                      <p.icon className="h-4.5 w-4.5" aria-hidden />
                    </span>
                    <span className="rounded-md bg-periwinkle-100 px-2.5 py-1 text-xs font-semibold tabular-nums text-periwinkle-500">
                      0{i + 1}
                    </span>
                  </CardHeader>
                  <CardContent>
                    <p className="font-semibold tracking-tight">{p.title}</p>
                    <p className="mt-1.5 text-sm leading-relaxed text-periwinkle-600">
                      {p.text}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Pasos */}
        <section
          id="recorrido"
          className="mx-auto max-w-6xl scroll-mt-20 px-6 py-14"
        >
          <Badge variant="outline" className="rounded-md px-3 py-1">
            Recorrido
          </Badge>
          <h2 className="mt-3 text-balance text-3xl font-bold tracking-tight">
            Del registro al cierre en cinco pasos
          </h2>
          <ol className="mt-8 grid list-none gap-3 rounded-lg border border-periwinkle-200 bg-periwinkle-50 p-3 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s, i) => (
              <li key={s.n} className={cn("h-full", s.wide && "sm:col-span-2")}>
                <Reveal delay={(i % 4) * 80} className="h-full">
                <article
                  className={cn(
                    "flex h-full flex-col rounded-md p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md",
                    s.dark
                      ? "bg-gradient-to-br from-[#120c27] to-[#352574] text-white shadow-md shadow-[#120c27]/20"
                      : "border border-periwinkle-200 bg-white"
                  )}
                >
                  <span
                    className={cn(
                      "inline-flex w-fit items-center rounded-md px-2.5 py-1 text-xs font-bold tabular-nums shadow-sm",
                      s.dark
                        ? "bg-white/15 text-white"
                        : "bg-gradient-to-r from-[#120c27] to-[#352574] text-white"
                    )}
                  >
                    {s.n}
                  </span>
                  <p className="mt-3 font-semibold tracking-tight">{s.title}</p>
                  <p
                    className={cn(
                      "mt-1.5 text-sm leading-relaxed",
                      s.dark ? "text-periwinkle-200" : "text-periwinkle-600"
                    )}
                  >
                    {s.text}
                  </p>
                  {s.chips && (
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {s.chips.map((c) => (
                        <span
                          key={c}
                          className="rounded-md bg-periwinkle-100 px-2.5 py-1 text-[11px] font-medium text-periwinkle-700"
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                  )}
                  {s.mono && (
                    <p className="mt-4 rounded-md bg-white/10 px-3 py-2 font-mono text-xs tabular-nums text-white">
                      {s.mono}
                    </p>
                  )}
                </article>
                </Reveal>
              </li>
            ))}
          </ol>
          <Card className="mt-6 rounded-lg border-icy-aqua-200 bg-gradient-to-r from-icy-aqua-50/90 to-white shadow-sm">
            <CardContent className="flex flex-col gap-3 p-5 text-sm leading-relaxed text-periwinkle-700 sm:flex-row sm:items-center">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#120c27] text-white">
                <FactCheck className="h-4.5 w-4.5" aria-hidden />
              </span>
              <p>
                La <strong>fecha_fiscal</strong> determina el período fiscal,
                nunca la fecha de registro. Si un documento de agosto se
                registra en septiembre, se reporta en agosto. Base imponible,
                alícuota, débito fiscal y crédito fiscal siempre con idioma
                ubicuo: sin sinónimos.
              </p>
            </CardContent>
          </Card>
        </section>

        {/* Roles */}
        <section
          id="roles"
          className="mx-auto max-w-6xl scroll-mt-20 px-6 pb-14"
        >
          <Badge variant="outline" className="rounded-md px-3 py-1">
            Para ti, contador
          </Badge>
          <h2 className="mt-3 text-balance text-2xl font-bold tracking-tight">
            Un auxiliar, cuatro formas de trabajar contigo
          </h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {roles.map((r, i) => (
              <Reveal key={r.rol} delay={(i % 4) * 80} className="h-full">
              <Card
                className="group relative h-full overflow-hidden rounded-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
              >
                <div
                  className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#120c27] via-[#352574] to-[#37c8a1] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                  aria-hidden
                />
                <CardHeader className="flex flex-row items-center gap-3 space-y-0">
                  <span className="flex h-9 w-9 items-center justify-center rounded-md bg-periwinkle-100 text-[#120c27] transition-colors duration-300 group-hover:bg-[#120c27] group-hover:text-white">
                    <r.icon className="h-4.5 w-4.5" aria-hidden />
                  </span>
                  <CardTitle className="text-base tracking-tight">
                    {r.rol}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm leading-relaxed text-periwinkle-600">
                  {r.text}
                </CardContent>
              </Card>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Alcance */}
        <section
          id="alcance"
          className="mx-auto max-w-6xl scroll-mt-20 px-6 pb-14"
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="overflow-hidden rounded-lg transition-shadow duration-300 hover:shadow-lg">
              <div
                className="h-1 bg-gradient-to-r from-icy-aqua-500 to-icy-aqua-300"
                aria-hidden
              />
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Badge variant="success">v1</Badge>
                  <CardTitle>Alcance v1 — dentro</CardTitle>
                </div>
                <CardDescription>
                  Empresas y sucursales opcionales, terceros con RIF dual,
                  documentos y pagos mínimos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2.5 text-sm leading-relaxed text-periwinkle-700">
                  {[
                    "Facturas, notas de crédito y notas de débito con documento afectado obligatorio",
                    "Reporte Z por máquina fiscal y modo de Libro de Ventas configurable por empresa",
                    "Retenciones multi-factura y comprobantes con justificación visible",
                    "Importación de CSV con control por lotes: archivos y filas validados, sin duplicados",
                    "Libros, Resumen de IVA, conciliación con desglose y cierre con acta y huella",
                    "Bitácora inalterable con registro en la misma operación",
                  ].map((t) => (
                    <li key={t} className="flex gap-2.5">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-icy-aqua-100">
                        <CheckCircle
                          className="h-3 w-3 text-icy-aqua-700"
                          aria-hidden
                        />
                      </span>
                      {t}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
            <Card className="overflow-hidden rounded-lg transition-shadow duration-300 hover:shadow-lg">
              <div
                className="h-1 bg-gradient-to-r from-periwinkle-300 to-periwinkle-200"
                aria-hidden
              />
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Badge variant="muted">explícito</Badge>
                  <CardTitle>Fuera de v1 — explícito</CardTitle>
                </div>
                <CardDescription>
                  Diseño reservado, sin construir
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2.5 text-sm leading-relaxed text-periwinkle-700">
                  {[
                    "Factura electrónica y portal de proveedores (rol proveedor reservado, sin acceso)",
                    "Contabilidad completa: diario, mayor y balance",
                    "Nómina, inventario y conciliación bancaria",
                    "OCR/IA y API en tiempo real con legacy, Z o SENIAT",
                    "Moneda extranjera, redondeo definitivo y formato ISLR: bloqueados hasta matriz firmada",
                  ].map((t) => (
                    <li key={t} className="flex gap-2.5">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-periwinkle-100">
                        <Lock
                          className="h-3 w-3 text-periwinkle-500"
                          aria-hidden
                        />
                      </span>
                      {t}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Prueba social */}
        <section
          id="prueba"
          className="mx-auto max-w-6xl scroll-mt-20 px-6 pb-14"
        >
          <Reveal>
            <Badge variant="outline" className="rounded-md px-3 py-1">
              La prueba
            </Badge>
            <h2 className="mt-3 max-w-2xl text-balance text-3xl font-bold tracking-tight">
              Tu mes real manda: igual a tu Excel o no se cierra
            </h2>
            <p className="mt-3 max-w-2xl text-pretty text-periwinkle-600">
              Requisito de go-live, no resultado logrado: validamos celda por
              celda contra tu mes piloto. Estado actual: infraestructura lista
              en desarrollo, 1 caso didáctico verde; faltan tu plantilla
              validada, tus CSV/Z reales y tus 30–50 casos firmados.
            </p>
          </Reveal>
          <dl className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              ["Gate: diferencia vs tu Excel", "0"],
              ["Gate: huecos en numeración IVA", "0"],
              ["Gate: fugas entre empresas", "0"],
              ["Casos firmados por ti", "0/30–50"],
            ].map(([dt, dd], i) => (
              <Reveal key={dt} delay={i * 80} className="h-full">
                <div className="flex h-full flex-col justify-center rounded-md border border-periwinkle-200 bg-white px-5 py-4 text-center shadow-sm">
                  <dd className="order-first font-mono text-3xl font-bold tabular-nums tracking-tight text-[#120c27]">
                    {dd}
                  </dd>
                  <dt className="mt-1 text-xs text-periwinkle-500">{dt}</dt>
                </div>
              </Reveal>
            ))}
          </dl>
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            <Reveal className="h-full">
              <Card className="h-full rounded-lg">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base tracking-tight">
                    Hoy: Excel + sistema anterior
                  </CardTitle>
                  <CardDescription>
                    Lo que dejas atrás con tu auxiliar
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2.5 text-sm leading-relaxed text-periwinkle-600">
                    {[
                      "Transcripción a mano entre el sistema, el Excel y la máquina fiscal",
                      "Fórmulas frágiles que nadie se atreve a auditar",
                      "Sin rastro del total reportado a la factura de origen",
                      "El mes cierra aunque las cifras no cuadren",
                    ].map((t) => (
                      <li key={t} className="flex gap-2.5">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-periwinkle-100">
                          <Close
                            className="h-3 w-3 text-periwinkle-400"
                            aria-hidden
                          />
                        </span>
                        {t}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </Reveal>
            <Reveal delay={100} className="h-full">
              <Card className="h-full overflow-hidden rounded-lg">
                <div
                  className="h-1 bg-gradient-to-r from-[#120c27] via-[#352574] to-[#37c8a1]"
                  aria-hidden
                />
                <CardHeader className="pb-3">
                  <CardTitle className="text-base tracking-tight">
                    Con tu asistente automático
                  </CardTitle>
                  <CardDescription>
                    Tú validas y firmas, él prepara
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2.5 text-sm leading-relaxed text-periwinkle-700">
                    {[
                      "Libros y resumen derivados de los documentos, sin transcribir",
                      "Preview con regla y justificación visible antes de emitir",
                      "Desglose total → factura → archivo preparado para tu revisión",
                      "Acta de cierre con huella: si no cuadra con tu Excel, no cierra",
                    ].map((t) => (
                      <li key={t} className="flex gap-2.5">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-icy-aqua-100">
                          <CheckCircle
                            className="h-3 w-3 text-icy-aqua-700"
                            aria-hidden
                          />
                        </span>
                        {t}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </Reveal>
          </div>
        </section>

        {/* CTA final */}
        <section className="mx-auto max-w-6xl px-6 pb-16">
          <div className="relative overflow-hidden rounded-lg bg-gradient-to-r from-[#120c27] to-[#352574] p-8 shadow-xl shadow-[#120c27]/20 sm:p-12">
            <div
              className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:36px_36px] [mask-image:radial-gradient(ellipse_70%_80%_at_70%_20%,black,transparent)]"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#37c8a1]/30 blur-3xl"
              aria-hidden
            />
            <div className="relative grid items-center gap-8 lg:grid-cols-[1.2fr_0.8fr]">
              <div>
                <Badge className="border-white/20 bg-white/10 text-white">
                  Gate de go-live
                </Badge>
                <h2 className="mt-4 text-balance text-2xl font-bold tracking-tight text-white sm:text-3xl">
                  Tu firma es el go-live: mes piloto igual a tu Excel
                </h2>
                <CardDescription className="mt-3 max-w-xl text-periwinkle-200">
                  Paralelo Excel vs sistema igual a cero, 0 huecos IVA bajo
                  concurrencia, 0 fugas entre empresas y cierre reproducible
                  con huella. Sin tu matriz firmada y tus casos validados no se
                  cierra F0/F2.
                </CardDescription>
                <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs text-periwinkle-300">
                  <span className="inline-flex items-center gap-1.5">
                    <CheckCircle className="h-3.5 w-3.5" aria-hidden /> Gate:
                    Excel = 0 diferencia
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <VerifiedUser className="h-3.5 w-3.5" aria-hidden /> 0 huecos
                    IVA · 0 fugas · tu firma
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row lg:flex-col lg:items-stretch xl:flex-row lg:justify-end">
                <Button
                  size="lg"
                  variant="secondary"
                  asChild
                  className="rounded-md bg-white px-7 text-[#120c27] shadow-lg hover:bg-icy-aqua-50 active:scale-[0.98]"
                >
                  <Link href="/login">
                    Entrar al sistema <ArrowForward aria-hidden />
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  asChild
                  className="rounded-md border-white/30 bg-transparent px-7 text-white hover:bg-white/10 hover:text-white active:scale-[0.98]"
                >
                  <Link href="/dashboard">Ir al dashboard</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-periwinkle-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-8 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#120c27] text-white"
              aria-label="ERP-TributarioLite — inicio"
            >
              <AccountBalance className="h-4 w-4" aria-hidden />
            </Link>
            <div>
              <p className="text-sm font-semibold text-[#120c27]">
                © 2026 ERP-TributarioLite — Fuente única de verdad fiscal.
              </p>
              <p className="text-xs text-periwinkle-500">
                IVA · ISLR Venezuela · Motor versionado · Trazabilidad completa
              </p>
            </div>
          </div>
          <span className="text-sm text-periwinkle-600">
            Desarrollado por{" "}
            <span className="font-semibold text-[#120c27]">NoDoz</span>{" "}
            <a
              href="https://github.com/noemdb"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-[#120c27] hover:underline"
            >
              @noemdb
            </a>{" "}
            <span className="text-periwinkle-400">·</span> FSD
          </span>
        </div>
        <div className="border-t border-periwinkle-200/70">
          <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-5 text-sm text-periwinkle-500 sm:flex-row sm:items-center sm:justify-between">
            <nav
              className="flex flex-wrap gap-x-6 gap-y-2"
              aria-label="Accesos"
            >
              <Link href="/login" className="transition-colors hover:text-[#120c27]">
                Entrar al sistema
              </Link>
              <Link href="/dashboard" className="transition-colors hover:text-[#120c27]">
                Ir al dashboard
              </Link>
              <Link href="/dashboard" className="transition-colors hover:text-[#120c27]">
                Continuar
              </Link>
            </nav>
            <p className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                Tu auxiliar prepara → tú firmas → cierre
                <ArrowForward className="h-3.5 w-3.5" aria-hidden />
              </span>
              <a
                href="#top"
                className="inline-flex items-center gap-1 rounded-md transition-colors hover:text-[#120c27]"
              >
                Volver arriba
                <ArrowUpward className="h-3.5 w-3.5" aria-hidden />
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
