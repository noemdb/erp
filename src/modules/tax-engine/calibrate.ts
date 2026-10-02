import Decimal from "decimal.js";

/**
 * S0/G8 (2.0.1 WS4): calibración de redondeo. Matriz 2×2×2 = 8 combinaciones:
 * precisión intermedia (8 cifras significativas | exacta) × etapa de redondeo
 * final (línea | documento) × modo (HALF_UP | HALF_EVEN).
 * (El roadmap menciona 12 previendo un tercer modo; se agregará si el contador
 * lo pide. Puro y determinista; NO cambia `round2` provisional hasta firma ADR-014.)
 */

export type CalibOptions = {
  precision: "sig8" | "exact";
  stage: "line" | "document";
  mode: "HALF_UP" | "HALF_EVEN";
};

const RM = { HALF_UP: Decimal.ROUND_HALF_UP, HALF_EVEN: Decimal.ROUND_HALF_EVEN } as const;

function q2(v: Decimal, mode: CalibOptions["mode"]): Decimal {
  return v.toDecimalPlaces(2, RM[mode]);
}

function mul(base: string, rate: string, o: CalibOptions): Decimal {
  const raw = new Decimal(base).times(rate);
  return o.precision === "sig8" ? raw.toSignificantDigits(8) : raw;
}

export function computeIvaCalib(lines: { base: string; rate: string }[], o: CalibOptions): { lineIvas: string[]; totalIva: string } {
  if (o.stage === "line") {
    const lineIvas = lines.map((l) => q2(mul(l.base, l.rate, o), o.mode).toFixed(2));
    const total = lineIvas.reduce((a, x) => a.plus(x), new Decimal(0));
    return { lineIvas, totalIva: q2(total, o.mode).toFixed(2) };
  }
  const exact = lines.reduce((a, l) => a.plus(mul(l.base, l.rate, o)), new Decimal(0));
  const lineIvas = lines.map((l) => q2(mul(l.base, l.rate, o), o.mode).toFixed(2));
  return { lineIvas, totalIva: q2(exact, o.mode).toFixed(2) };
}

export const ALL_COMBOS: CalibOptions[] = (
  ["sig8", "exact"] as const
).flatMap((precision) =>
  (["line", "document"] as const).flatMap((stage) =>
    (["HALF_UP", "HALF_EVEN"] as const).map((mode) => ({ precision, stage, mode })),
  ),
);

export type CalibDoc = { id: string; lines: { base: string; rate: string }[]; legacyTotalIva: string };

export function comboName(o: CalibOptions): string {
  return `${o.precision}/${o.stage}/${o.mode}`;
}

/** Por combinación: documentos con diferencia vs legacy y suma de diferencias. */
export function calibrate(docs: CalibDoc[]): { combo: string; docsConDiff: number; sumaDiff: string }[] {
  return ALL_COMBOS.map((o) => {
    let n = 0;
    let sum = new Decimal(0);
    for (const d of docs) {
      const diff = new Decimal(computeIvaCalib(d.lines, o).totalIva).minus(d.legacyTotalIva).abs();
      if (diff.gt("0.005")) {
        n++;
        sum = sum.plus(diff);
      }
    }
    return { combo: comboName(o), docsConDiff: n, sumaDiff: sum.toFixed(2) };
  });
}
