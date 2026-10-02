import Link from "next/link";
import ArrowBack from "@mui/icons-material/ArrowBack";
import Calculate from "@mui/icons-material/Calculate";
import AccountBalance from "@mui/icons-material/AccountBalance";
import FindInPage from "@mui/icons-material/FindInPage";
import VerifiedUser from "@mui/icons-material/VerifiedUser";
import Approval from "@mui/icons-material/Approval";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSessionUser } from "@/modules/identity/session";
import { LoginForm } from "./login-form";

const highlights = [
  {
    icon: Calculate,
    title: "Motor versionado",
    text: "Alícuota y porcentaje por vigencia, con constancia de la regla aplicada en cada cálculo.",
  },
  {
    icon: FindInPage,
    title: "Trazabilidad completa",
    text: "De cada total al documento fiscal, a la fila del CSV y al archivo de origen.",
  },
  {
    icon: Approval,
    title: "Numeración sin huecos",
    text: "Serie por empresa y período con reserva transaccional: un fallo no consume número.",
  },
  {
    icon: VerifiedUser,
    title: "Cierre reproducible",
    text: "Período congelado con acta de cierre y huella digital. Lo cerrado no se edita.",
  },
];

export default async function LoginPage() {
  if (await getSessionUser()) redirect("/dashboard");
  return (
    <div className="grid min-h-screen bg-white text-periwinkle-900 lg:grid-cols-[1.05fr_0.95fr]">
      {/* Columna izquierda: información del sistema */}
      <aside className="relative hidden overflow-hidden bg-gradient-to-br from-[#120c27] via-[#120c27] to-[#352574] text-white lg:flex">
        <div
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.07)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.07)_1px,transparent_1px)] bg-[size:44px_44px] [mask-image:radial-gradient(ellipse_70%_70%_at_30%_30%,black,transparent)]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-[#37c8a1]/25 blur-3xl"
          aria-hidden
        />
        <div className="relative mx-auto flex w-full max-w-md flex-col justify-center gap-8 p-12">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-white/10 text-white ring-1 ring-white/20">
              <AccountBalance className="h-5 w-5" aria-hidden />
            </span>
            <span className="text-sm font-semibold tracking-tight">
              ERP-TributarioLite
              <span className="block text-xs font-normal text-periwinkle-300">
                Fuente única de verdad fiscal
              </span>
            </span>
          </Link>

          <div>
            <Badge className="border-white/20 bg-white/10 text-white">
              IVA · ISLR · Multiempresa — Venezuela
            </Badge>
            <h1 className="mt-4 text-balance text-3xl font-bold leading-tight tracking-tight">
              Del registro al cierre, sin reescribir Excel
            </h1>
            <p className="mt-3 text-pretty text-sm leading-relaxed text-periwinkle-300">
              Registra compras, ventas, pagos y retenciones una sola vez y
              deriva libros, Resumen de IVA y comprobantes con trazabilidad
              total.
            </p>
          </div>

          <ul className="space-y-4">
            {highlights.map((h) => (
              <li key={h.title} className="flex gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-white/10 text-icy-aqua-200 ring-1 ring-white/15">
                  <h.icon className="h-4 w-4" aria-hidden />
                </span>
                <div>
                  <p className="text-sm font-semibold">{h.title}</p>
                  <p className="mt-0.5 text-sm leading-relaxed text-periwinkle-300">
                    {h.text}
                  </p>
                </div>
              </li>
            ))}
          </ul>

          <div className="rounded-md border border-white/15 bg-white/5 p-4 backdrop-blur">
            <p className="text-sm font-semibold">
              Mes real igual a Excel, o no se cierra el mes
            </p>
            <p className="mt-1 text-xs leading-relaxed text-periwinkle-300">
              Paralelo contra Excel igual a cero · 0 huecos · 0 fugas entre
              empresas · 100–200 documentos/mes
            </p>
          </div>
        </div>
        <div
          className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-[#37c8a1] via-[#352574] to-transparent"
          aria-hidden
        />
      </aside>

      {/* Columna derecha: formulario */}
      <main className="relative flex flex-col">
        <div
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:44px_44px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,black,transparent)]"
          aria-hidden
        />
        <div className="relative mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-10">
          <div className="mb-8 flex items-center justify-between">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-md text-sm text-periwinkle-500 transition-colors hover:text-[#120c27]"
            >
              <ArrowBack className="h-4 w-4" aria-hidden />
              Volver al inicio
            </Link>
            <span className="flex items-center gap-2 lg:hidden">
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[#120c27] text-white">
                <AccountBalance className="h-4 w-4" aria-hidden />
              </span>
              <span className="text-sm font-semibold">ERP-TributarioLite</span>
            </span>
          </div>

          <Card className="rounded-lg shadow-xl shadow-periwinkle-200/60 ring-1 ring-[#120c27]/5">
            <div
              className="h-1 rounded-t-lg bg-gradient-to-r from-[#120c27] via-[#352574] to-[#37c8a1]"
              aria-hidden
            />
            <CardHeader className="pb-4">
              <CardTitle className="text-xl tracking-tight">
                Entrar al sistema
              </CardTitle>
              <CardDescription>
                Sesión por empresa, con roles y bitácora de auditoría.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LoginForm />
            </CardContent>
          </Card>

          <p className="mt-6 text-center text-xs leading-relaxed text-periwinkle-400">
            Acceso restringido a usuarios registrados.
            <br />
            Si necesitas una cuenta, contacta al administrador del sistema.
          </p>
        </div>
      </main>
    </div>
  );
}
