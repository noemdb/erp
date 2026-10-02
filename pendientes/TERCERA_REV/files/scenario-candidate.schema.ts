// Esquema Zod PROPUESTO para candidatos de escenarios dorados (fixtures/tax-scenarios/candidatos).
// Contrato confirmado por el dueño del proyecto: porcentajes como FRACCIÓN y base `base_gravable` (ISLR).
// Los demás nombres de campo son propuesta: ajustarlos a los tipos reales del motor si difieren.
import { z } from "zod";

/** Fracción decimal entre 0 y 1 (p. ej. "0.03" = 3 %). Hasta 8 decimales hasta que G8 fije la precisión. */
const Fraction = z.string().regex(/^(0(\.\d{1,8})?|1(\.0{1,8})?)$/, "fracción decimal 0..1 como string");
/** Importe monetario como string decimal con 2 decimales. */
const Money = z.string().regex(/^-?\d+\.\d{2}$/, "importe con 2 decimales");
const IsoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "AAAA-MM-DD");

const Estado = z.enum([
  "CANDIDATO",            // propuesto, sin firma
  "PENDIENTE_CRITERIO",   // depende de una decisión fiscal abierta (G2, G8…)
  "FUERA_DE_ALCANCE_V1",  // registrado pero sin cálculo automático en v1
  "VALIDADO_CONTADOR",    // firmado: único estado que entra al gate
]);

const Firma = z.object({
  por: z.string().min(1),
  fecha: IsoDate,
  sha256_contenido: z.string().regex(/^[a-f0-9]{64}$/), // firma ligada al contenido (ROADMAP-04 §3.1)
});

const Base = {
  id: z.string().regex(/^[A-Z]+-\d{2}$/),
  descripcion: z.string().min(1),
  asOf: IsoDate,                                  // fecha del evento: el motor no usa reloj
  origen: z.enum(["sintetico", "real_anonimizado"]),
  estado: Estado,
  ejecutable: z.boolean(),
  notas: z.string().optional(),
  firma: Firma.optional(),                        // obligatoria cuando estado = VALIDADO_CONTADOR
};

const IslrParametros = z.object({
  porcentaje: Fraction,
  sustraendo_ut: z.boolean(),
  ut: Money,
  factor_sustraendo: z.string(),                  // 83.3334 (multiplicador, no porcentaje)
});

export const IslrScenario = z.object({
  ...Base,
  tipo: z.literal("islr"),
  concepto: z.string(),                           // numeral del Decreto 1.808, art. 9
  beneficiario: z.enum(["PNR", "PNNR", "PJD", "PJND"]),
  entrada: z.object({
    monto_operacion: Money.optional(),            // monto pagado/abonado (informativo)
    factor_base: z.string().optional(),           // p. ej. "0.90" en honorarios a no residentes (fracción)
    alicuota_iva: Fraction.optional(),            // cuando la base se deriva del monto con IVA
    base_gravable: Money.optional(),              // base sobre la que se aplica `porcentaje`
    pagos: z.array(z.object({ monto_operacion: Money, base_gravable: Money, fecha: IsoDate })).optional(),
  }),
  parametros: IslrParametros,
  esperado: z.object({ sustraendo: Money, retencion: Money }).optional(),
  variantes: z.array(z.object({
    criterio_sustraendo: z.enum(["por_pago", "una_vez_por_factura"]),
    esperado: z.object({ retenciones_por_pago: z.array(Money), retencion_total: Money }),
  })).optional(),
  formula: z.string().optional(),
}).refine(
  (s) => s.estado !== "VALIDADO_CONTADOR" || s.firma !== undefined,
  { message: "un escenario VALIDADO_CONTADOR requiere firma ligada al contenido" },
);

export const IvaScenario = z.object({
  ...Base,
  tipo: z.literal("iva"),
  entrada: z.object({
    base_imponible: Money,
    alicuota: Fraction,
    iva_causado: Money,
    precio_facturado: Money.optional(),
    iva_discriminado: z.boolean().optional(),
    monto_operacion: Money.optional(),
    pagado_con_caja_chica: z.boolean().optional(),
    proveedor_contribuyente_formal: z.boolean().optional(),
  }),
  parametros: z.object({
    porcentaje_retencion: Fraction,
    limite_caja_chica_ut: z.string().optional(),
    ut: Money.optional(),
    limite_caja_chica: Money.optional(),
  }),
  esperado: z.object({ retencion: Money, motivo_no_retencion: z.string().optional() }),
  formula: z.string().optional(),
});

export const EventoRetencionScenario = z.object({
  ...Base,
  tipo: z.literal("evento_retencion"),
  concepto: z.string(),
  beneficiario: z.enum(["PNR", "PNNR", "PJD", "PJND"]),
  parametros: z.object({ porcentaje: Fraction, sustraendo_ut: z.boolean() }),
  entrada: z.object({
    base_gravable_documento: Money,
    eventos: z.array(z.object({
      tipo: z.enum(["payment", "account_credit"]),
      fecha: IsoDate,
      base_gravable: Money,
      nota: z.string().optional(),
    })),
  }),
  esperado: z.object({
    retenciones: z.array(z.object({
      evento: z.number().int().nonnegative(),
      fecha_retencion: IsoDate.optional(),
      retencion: Money,
      motivo: z.string().optional(),
    })),
    retencion_total: Money,
  }),
});

export const ScenarioFile = z.object({
  version: z.string(),
  fecha: IsoDate,
  contrato: z.record(z.string(), z.string()),
  aviso: z.string(),
  escenarios: z.array(z.union([IslrScenario, IvaScenario, EventoRetencionScenario])),
}).superRefine((f, ctx) => {
  const ids = new Set<string>();
  for (const e of f.escenarios) {
    if (ids.has(e.id)) ctx.addIssue({ code: "custom", message: `id duplicado: ${e.id}` });
    ids.add(e.id);
    if (e.ejecutable && e.estado !== "CANDIDATO" && e.estado !== "VALIDADO_CONTADOR") {
      ctx.addIssue({ code: "custom", message: `${e.id}: ejecutable con estado ${e.estado}` });
    }
  }
});
