import Link from "next/link";
import { redirect } from "next/navigation";
import ArrowForward from "@mui/icons-material/ArrowForward";
import MenuBook from "@mui/icons-material/MenuBook";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Reveal } from "@/components/ui/reveal";
import { AppHeader, PageFooter } from "@/components/layout/app-shell";
import { getSessionUser, listMemberships } from "@/modules/identity/session";
import { canManageUsersAnywhere } from "@/modules/identity/admin";
import { ManualLayout } from "./manual-layout";

type Fn = { id: string; title: string; body: string; points?: string[]; route?: { label: string; href: string } };
type Role = { id: string; rol: string; badge: string; intro: string; fns: Fn[] };

function Flow({ steps }: { steps: string[] }) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-1.5" aria-label="Diagrama de flujo">
      {steps.map((s, i) => (
        <span key={s} className="flex items-center gap-1.5">
          {i > 0 && <ArrowForward className="h-3.5 w-3.5 shrink-0 text-icy-aqua-600" aria-hidden />}
          <span className="rounded-md bg-periwinkle-100 px-2.5 py-1 text-[11px] font-medium text-periwinkle-800">{s}</span>
        </span>
      ))}
    </div>
  );
}

const ROLES: Role[] = [
  {
    id: "contador",
    rol: "Contador",
    badge: "Firma y cierra",
    intro: "Revisas, firmas decisiones, emites comprobantes y cierras períodos. Nada fiscal se activa sin tu firma.",
    fns: [
      {
        id: "contador-decisiones", title: "1 · Firmar decisiones fiscales",
        body: "Registra el hecho, compara opciones A/B con impacto numérico y firma con nombre y cédula. Al firmar se congela una huella sha256: lo firmado no se edita, se sustituye con una decisión nueva que cita a la anterior.",
        points: ["Decisiones → Nueva → completar en ficha → Enviar a revisión → Aprobar → Firmar", "Si preparaste el borrador y hay otro contador, el motivo de auto-firma es obligatorio"],
        route: { label: "Ir a Decisiones", href: "/dashboard" },
      },
      {
        id: "contador-reglas", title: "2 · Activar reglas con vigencia",
        body: "Crea borradores con porcentaje, sustraendo, base y fuente normativa. Activar cierra la vigencia anterior sin borrar historia; dos reglas del mismo tipo y concepto nunca se solapan.",
        points: ["Flujo: borrador → revisión → aprobación → activación", "La activación exige decisión firmada vinculada con cobertura (mismo impuesto y concepto)"],
      },
      {
        id: "contador-iva", title: "3 · Emitir retención de IVA",
        body: "Selecciona facturas elegibles, revisa el preview con justificación línea por línea y emite. El número se reserva en la misma transacción: si algo falla, no se consume.",
        points: ["Numeración AAAAMMSSSSSSSS sin huecos; lo anulado no se reutiliza", "El PDF se genera tras confirmar, con reintentos automáticos"],
      },
      {
        id: "contador-islr", title: "4 · Emitir retención de ISLR",
        body: "Por concepto de pago (honorarios, comisiones, alquileres…): base gravable, porcentaje y sustraendo. La fórmula max(0, base × % − sustraendo) nunca da negativo.",
        points: ["Serie provisional ISLR-AAAAMM-###### hasta definir formato G9", "Compara ambos escenarios pago/abono antes de emitir"],
      },
      {
        id: "contador-g2", title: "5 · Configurar criterio de abono (G2)",
        body: "Solo tú cambias el criterio pago vs abono en cuenta, con motivo auditado. Mientras siga sin definir, el sistema solo emite pagos donde ambos escenarios convergen.",
        points: ["Preview dual visible siempre: fecha, período, regla, base e importe por escenario", "Un evento retroactivo tras una retención vigente exige anular primero"],
      },
      {
        id: "contador-resumen", title: "6 · Revisar resumen y conciliación",
        body: "El resumen consolida débitos, créditos, retenciones y cuota. La conciliación verifica libros ↔ resumen ↔ comprobantes con tolerancia provisional 0,01 hasta definir redondeo.",
        points: ["Cada total tiene desglose hasta el documento", "Controles automáticos F8 marcan duplicados, RIF inválidos y retenciones sin conciliar"],
      },
      {
        id: "contador-cierre", title: "7 · Cerrar y reabrir períodos",
        body: "El checklist debe estar en verde para cerrar: se congela el resumen y se genera la huella de cierre. Reapertura solo con motivo y responsable, todo en bitácora.",
        points: ["Cerrado bloquea movimientos en app y base de datos", "Correcciones post-cierre entran como ajustes al período abierto"],
      },
      {
        id: "contador-entrega", title: "8 · Entregar y evidenciar",
        body: "Registra la fecha de entrega de cada comprobante y exporta libros, resúmenes y bitácora a CSV para el expediente del mes.",
        points: ["Descargas con neutralización anti-inyección", "El auditor reconstruye quién → qué → cuándo → regla → resultado"],
      },
    ],
  },
  {
    id: "administrativo",
    rol: "Administrativo",
    badge: "Prepara",
    intro: "Registras, importas y preparas. No emites comprobantes ni cierras períodos.",
    fns: [
      {
        id: "admin-acceso", title: "1 · Entrar y elegir empresa",
        body: "Accede con correo y contraseña; verás solo tus empresas autorizadas. La empresa activa viaja en la dirección para no operar sobre la equivocada.",
        points: ["Tras 5 intentos fallidos espera un minuto", "Sal siempre con el botón Salir"],
      },
      {
        id: "admin-importar", title: "2 · Importar CSV por lotes",
        body: "Sube el archivo, valida filas y confirma solo válidas. Subir dos veces el mismo archivo no duplica: se detecta por huella.",
        points: ["Filas NC rechazadas: van a registro manual con documento afectado", "Abono ≠ 0 solo avisa: el evento se registra aparte"],
      },
      {
        id: "admin-compras", title: "3 · Registrar compras manuales",
        body: "Completa proveedor, números de factura y control, fechas, base, IVA y total. Base + IVA debe cuadrar con el total o se rechaza.",
        points: ["La fecha fiscal determina el período, no la fecha de registro", "Multilínea con categorías gravada, exenta y no sujeta"],
      },
      {
        id: "admin-ventas", title: "4 · Registrar ventas y reportes Z",
        body: "Facturas individuales o resumen Z por máquina fiscal, según el modo de la empresa y sucursal. Ambos modos no se mezclan en el mismo período.",
        points: ["El Z consolida rango de facturas con identidad propia", "Saltos de numeración generan advertencia"],
      },
      {
        id: "admin-pagos", title: "5 · Registrar pagos y abonos",
        body: "Registra el evento (pago o abono en cuenta) con fecha efectiva y asígnalo a sus documentos. Registrar no emite retenciones por sí solo.",
        points: ["El beneficiario del evento debe coincidir con el proveedor", "Lo asignado no puede exceder el evento ni el total de la compra"],
      },
      {
        id: "admin-ncnd", title: "6 · Notas de crédito y débito",
        body: "Toda NC/ND exige documento afectado y la NC no puede exceder su saldo. Disminuyen o incrementan la operación original con trazabilidad.",
        points: ["NC no es devolución física: es documental", "Afectan libros y resumen del período fiscal que corresponda"],
      },
      {
        id: "admin-terceros", title: "7 · Mantener terceros y RIF",
        body: "Crea proveedores y clientes con RIF dual (original + normalizado). Los cambios de perfil fiscal agregan vigencia, nunca sobreescriben.",
        points: ["Vigencias incompatibles se rechazan automáticamente", "Inactivos conservan historia pero no aceptan documentos nuevos"],
      },
      {
        id: "admin-decisiones", title: "8 · Preparar decisiones y revisar reportes",
        body: "Puedes crear borradores de decisión (hecho + alternativas A/B) para que el contador complete y firme. Los libros se generan solos: úsalos para verificar tu carga.",
        points: ["Usa el desglose total → documento para autocontrol", "Exporta CSV para conciliar con tu auxiliar"],
      },
    ],
  },
  {
    id: "auditor",
    rol: "Auditor",
    badge: "Solo lectura",
    intro: "Trazas y verificas de punta a punta. No creas ni modificas nada.",
    fns: [
      {
        id: "aud-traza", title: "1 · Trazar total → documento → archivo",
        body: "Desde cualquier cifra del libro o resumen llega al documento, a la fila del CSV y al archivo de origen en pocos clics.",
        points: ["Línea de tiempo por documento con origen lote + fila", "Período y regla aplicada visibles en cada cálculo"],
      },
      {
        id: "aud-bita", title: "2 · Leer la bitácora",
        body: "Registro append-only: quién, cuándo, empresa, entidad, valores antes/después y motivo. Filtra por entidad, acción, ID y rango de fechas.",
        points: ["Exportable a CSV con los mismos filtros", "Ni la app puede editar ni borrar eventos"],
      },
      {
        id: "aud-decisiones", title: "3 · Verificar decisiones firmadas",
        body: "Cada decisión muestra firmante, fecha y huella sha256. Comprueba que la regla activa cite una decisión firmada vigente.",
        points: ["Firmada o aplicada: inmutable por base de datos", "Reemplazadas conservan motivo y decisión sustituta"],
      },
      {
        id: "aud-reglas", title: "4 · Revisar reglas y vigencias",
        body: "Historial completo borrador → revisión → aprobación → activación, con cierres de vigencia y responsable de aprobación.",
        points: ["Sin solapamientos de vigencia por tipo y concepto", "Valores sintéticos de prueba nunca activan en producción"],
      },
      {
        id: "aud-comprobantes", title: "5 · Validar comprobantes",
        body: "Cada comprobante guarda snapshot inmutable de datos + regla + explicación del cálculo y su PDF archivado con huella.",
        points: ["Anulados conservan número consumido y motivo", "Sustitutos referencian al original con replaces_id"],
      },
      {
        id: "aud-cierre", title: "6 · Validar cierre y huella",
        body: "El acta congela ids + versiones de documentos y reportes. Regenerar un reporte cerrado debe dar la misma huella.",
        points: ["Reaperturas solo con motivo, responsable y nueva versión", "Ajustes post-cierre referencian el original"],
      },
      {
        id: "aud-concilia", title: "7 · Revisar conciliación y controles",
        body: "Conciliación libros ↔ resumen ↔ comprobantes más 7 controles automáticos (bases, IVA, duplicados, retención, respaldo, cobertura).",
        points: ["Tolerancia provisional 0,01 hasta definir redondeo G8", "Hallazgos abiertos bloquean el cierre"],
      },
      {
        id: "aud-evidencia", title: "8 · Exportar evidencia",
        body: "CSV de libros, resúmenes, retenciones, decisiones y bitácora con neutralización anti-inyección, listos para papeles de trabajo.",
        points: ["Descargas firmadas de corta duración", "Sin datos sensibles en registros del sistema"],
      },
    ],
  },
  {
    id: "adm",
    rol: "Admin sistema",
    badge: "Plataforma",
    intro: "Usuarios, empresas y salud del sistema. Sin contenido fiscal.",
    fns: [
      {
        id: "adm-usuarios", title: "1 · Gestionar usuarios y roles",
        body: "Crea usuarios y asígnales empresa + rol (administrativo, contador, auditor). El proveedor no tiene acceso en v1.",
        points: ["Sin membresía no se ve nada: el aislamiento es por empresa", "Emisión, reglas y cierre son exclusivos del contador"],
      },
      {
        id: "adm-empresas", title: "2 · Empresas, sucursales y perfil fiscal",
        body: "Alta de empresas con RIF, condición de IVA y modo de ventas. Las sucursales permiten numeración y máquinas propias.",
        points: ["El tipo de período no se cambia con meses cerrados", "Todo cambio de perfil queda auditado con antes/después"],
      },
      {
        id: "adm-sesiones", title: "3 · Sesiones y revocación",
        body: "Sesiones en base de datos, revocables por usuario. Ante incidentes revisa sesiones activas y fuerza salida.",
        points: ["Expiración por inactividad + absoluta", "MFA recomendado para contador y admin"],
      },
      {
        id: "adm-recupero", title: "4 · Recuperación asistida de acceso",
        body: "Sin correo automático: generas un enlace de un solo uso y lo entregas por canal externo. Al usarse invalida sesiones y tokens.",
        points: ["Token de 256 bits, solo hash guardado, vida corta", "Contador y admin requieren segundo control"],
      },
      {
        id: "adm-salud", title: "5 · Vigilar salud y trabajos",
        body: "/api/health informa base + almacenamiento. Los PDF pendientes se reintentan por planificador con alerta de vencidos.",
        points: ["Sin Redis: ejecutor mínimo por planificador del host", "Umbrales documentados para instalar cola real"],
      },
      {
        id: "adm-backup", title: "6 · Respaldos y restore",
        body: "Respaldo diario + copia cifrada fuera del servidor, con simulacro de restauración documentado y tiempos RPO/RTO registrados.",
        points: ["Probar restore antes de producción es obligatorio", "Datos reales nunca en desarrollo sin anonimizar"],
      },
      {
        id: "adm-secretos", title: "7 · Rotar secretos",
        body: "Claves de base, firma de sesiones y almacenamiento rotan por runbook, antes de producción y tras cada incidente.",
        points: ["Claves distintas por entorno, fuera del repo", "La clave vieja debe quedar rechazada y registrado"],
      },
      {
        id: "adm-adjuntos", title: "8 · Archivos y descargas firmadas",
        body: "CSV originales, soportes y PDF/Excel emitidos viven en almacenamiento privado; la base guarda solo metadatos con huella.",
        points: ["Tipo por contenido, límite de tamaño, deduplicación", "Descargas con firma de corta duración y permiso revalidado"],
      },
    ],
  },
];

const DIAGRAMS: { title: string; steps: string[] }[] = [
  { title: "Decisión → regla → comprobante", steps: ["Hecho", "Alternativas A/B", "Firma + sha256", "Regla activa", "Comprobante"] },
  { title: "Importación por lotes", steps: ["Archivo + huella", "Staging", "Validar filas", "Confirmar", "Documentos"] },
  { title: "Emisión con número único", steps: ["Elegibles", "Preview justificado", "Reserva en transacción", "Emitido + snapshot", "PDF archivado"] },
  { title: "Trazabilidad del auditor", steps: ["Total", "Documento", "Fila CSV", "Archivo", "Regla + decisión"] },
];

export default async function ManualPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const memberships = await listMemberships(user.id);
  const canManageUsers = await canManageUsersAnywhere(user.id);

  return (
    <div className="min-h-screen bg-white text-periwinkle-900 antialiased">
      <AppHeader
        title="Manual de Usuario"
        back={{ href: "/dashboard", label: "Dashboard" }}
        user={user}
        companyCount={memberships.length}
        canManageUsers={canManageUsers}
      />
      <div className="mx-auto w-full px-6 pb-16">
        <ManualLayout
          roles={ROLES.map((r) => ({ id: r.id, rol: r.rol, badge: r.badge, fns: r.fns.map((f) => ({ id: f.id, title: f.title })) }))}
        >
            <div className="relative">
              <Badge variant="outline" className="rounded-md px-3 py-1">32 funciones · 4 roles</Badge>
              <h1 className="mt-3 text-balance text-3xl font-bold tracking-tight sm:text-4xl">Manual de Usuario</h1>
              <p className="mt-2 max-w-2xl text-sm text-periwinkle-500">
                Cada rol ve solo lo que puede hacer. El contador firma, el administrativo prepara,
                el auditor traza y el admin sostiene la plataforma.
              </p>
            </div>

            {ROLES.map((r, ri) => (
              <section key={r.id} id={r.id} aria-label={`Manual ${r.rol}`} className="mt-10 scroll-mt-24">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-2xl font-bold tracking-tight">{r.rol}</h2>
                  <Badge variant="secondary">{r.badge}</Badge>
                </div>
                <p className="mt-1 text-sm text-periwinkle-500">{r.intro}</p>
                <div className="mt-5 space-y-4">
                  {r.fns.map((f, i) => (
                    <Reveal key={f.id} delay={(i % 4) * 60}>
                      <Card id={f.id} className="scroll-mt-24 overflow-hidden rounded-lg">
                        <div className="h-1 bg-gradient-to-r from-[#120c27] via-[#352574] to-[#37c8a1]" aria-hidden />
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base tracking-tight">{f.title}</CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm leading-relaxed text-periwinkle-700">
                          <p>{f.body}</p>
                          {f.points && (
                            <ul className="mt-2.5 space-y-1.5">
                              {f.points.map((p) => (
                                <li key={p} className="flex gap-2">
                                  <ArrowForward className="mt-1 h-3.5 w-3.5 shrink-0 text-icy-aqua-600" aria-hidden />
                                  <span>{p}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                          {f.route && (
                            <p className="mt-2.5">
                              <Link href={f.route.href} className="font-medium text-[#120c27] hover:underline">
                                {f.route.label} <ArrowForward className="inline h-3.5 w-3.5" aria-hidden />
                              </Link>
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    </Reveal>
                  ))}
                </div>
                {ri < ROLES.length - 1 && <div className="mt-8 border-b border-periwinkle-100" aria-hidden />}
              </section>
            ))}

            {/* Diagramas */}
            <section id="diagramas" aria-label="Diagramas" className="mt-10 scroll-mt-24">
              <h2 className="text-2xl font-bold tracking-tight">Diagramas</h2>
              <p className="mt-1 text-sm text-periwinkle-500">Los cuatro recorridos del sistema, de punta a punta.</p>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {DIAGRAMS.map((d, i) => (
                  <Reveal key={d.title} delay={(i % 2) * 80}>
                    <Card className="h-full overflow-hidden rounded-lg">
                      <div className="h-1 bg-gradient-to-r from-[#37c8a1] via-[#352574] to-[#120c27]" aria-hidden />
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base tracking-tight">{d.title}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Flow steps={d.steps} />
                        <p className="mt-3 text-xs leading-relaxed text-periwinkle-500">
                          {i === 0 && "Sin firma no se activa: el comprobante siempre cita regla y decisión."}
                          {i === 1 && "Nada entra directo a documentos: todo pasa por staging validado e idempotente."}
                          {i === 2 && "El número nace y muere en la transacción: fallo no consume, anulado no se reutiliza."}
                          {i === 3 && "El auditor reconstruye quién → qué → cuándo → regla → resultado."}
                        </p>
                      </CardContent>
                    </Card>
                  </Reveal>
                ))}
              </div>
            </section>
        </ManualLayout>
      </div>
      <PageFooter context="Manual de Usuario" />
    </div>
  );
}
