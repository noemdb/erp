import ExcelJS from "exceljs";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";

/**
 * 1.0.3 §3.3 + 2.0.3 §4.2: comparador celda a celda con clasificación.
 * Niveles: estructura (hojas, dimensiones, merges) → contenido (valores) → formato.
 * Semántica (totales/bases) la verifica getAutoControls; aquí se comparan archivos.
 * Política: VALOR monetario tolerancia 0 (tras G8); FORMATO solo pasa si está
 * en el registro de aprobadas; ESTRUCTURA siempre bloquea.
 */
export type DiffKind = "ESTRUCTURA" | "VALOR" | "FORMATO";
export type CellDiff = { hoja: string; celda: string; kind: DiffKind; golden: string; actual: string };

function val(v: ExcelJS.CellValue): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "object") {
    if ("result" in v) return String((v as { result: unknown }).result ?? "");
    if ("text" in v) return String((v as { text: unknown }).text ?? "");
    if (v instanceof Date) return v.toISOString().slice(0, 10);
    return JSON.stringify(v);
  }
  return String(v);
}

function numFmt(c: ExcelJS.Cell): string {
  return typeof c.numFmt === "string" ? c.numFmt : "";
}

export async function compareWorkbooks(goldenBuf: Buffer, actualBuf: Buffer): Promise<{ diffs: CellDiff[]; sheets: { golden: string[]; actual: string[] } }> {
  const diffs: CellDiff[] = [];
  const g = new ExcelJS.Workbook();
  const a = new ExcelJS.Workbook();
  await g.xlsx.load(goldenBuf as unknown as ArrayBuffer);
  await a.xlsx.load(actualBuf as unknown as ArrayBuffer);
  const gSheets = g.worksheets.map((w) => w.name);
  const aSheets = a.worksheets.map((w) => w.name);
  for (const name of gSheets) {
    if (!aSheets.includes(name)) diffs.push({ hoja: name, celda: "—", kind: "ESTRUCTURA", golden: "hoja presente", actual: "hoja ausente" });
  }
  for (const name of aSheets) {
    if (!gSheets.includes(name)) diffs.push({ hoja: name, celda: "—", kind: "ESTRUCTURA", golden: "hoja ausente", actual: "hoja presente" });
  }
  for (const name of gSheets.filter((n) => aSheets.includes(n))) {
    const gw = g.getWorksheet(name)!;
    const aw = a.getWorksheet(name)!;
    if (gw.rowCount !== aw.rowCount || gw.columnCount !== aw.columnCount)
      diffs.push({ hoja: name, celda: "—", kind: "ESTRUCTURA", golden: `${gw.rowCount}x${gw.columnCount}`, actual: `${aw.rowCount}x${aw.columnCount}` });
    const mergesOf = (w: ExcelJS.Worksheet): string[] =>
      ((w.model.merges ?? []) as unknown[]).map((m) => String(m));
    const gMerges = new Set(mergesOf(gw));
    const aMerges = new Set(mergesOf(aw));
    for (const m of gMerges) if (!aMerges.has(m)) diffs.push({ hoja: name, celda: String(m), kind: "ESTRUCTURA", golden: "combinada", actual: "no combinada" });
    const n = Math.max(gw.rowCount, aw.rowCount);
    const mcols = Math.max(gw.columnCount, aw.columnCount);
    for (let r = 1; r <= n; r++) {
      for (let c = 1; c <= mcols; c++) {
        const gc = gw.getRow(r).getCell(c);
        const ac = aw.getRow(r).getCell(c);
        const gv = val(gc.value);
        const av = val(ac.value);
        // Normalización de tipos (fechas serial↔ISO, miles, RIF/mayúsculas, vacío≠cero).
        const same = normValue(gv) === normValue(av);
        if (!same) diffs.push({ hoja: name, celda: `${r}:${c}`, kind: "VALOR", golden: gv, actual: av });
        else if (numFmt(gc) !== numFmt(ac) && (gv !== "" || av !== "")) diffs.push({ hoja: name, celda: `${r}:${c}`, kind: "FORMATO", golden: numFmt(gc), actual: numFmt(ac) });
      }
    }
  }
  return { diffs, sheets: { golden: gSheets, actual: aSheets } };
}

/** Solo para tests/fixture: construye un libro mínimo en memoria. */
export async function buildSampleWorkbook(cells: { sheet: string; addr: string; value: string | number | Date; numFmt?: string }[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const bySheet = new Map<string, typeof cells>();
  for (const c of cells) bySheet.set(c.sheet, [...(bySheet.get(c.sheet) ?? []), c]);
  for (const [name, cs] of bySheet) {
    const ws = wb.addWorksheet(name);
    for (const c of cs) {
      const cell = ws.getCell(c.addr);
      cell.value = c.value as ExcelJS.CellValue;
      if (c.numFmt) cell.numFmt = c.numFmt;
    }
  }
  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

/** Normalización de tipos (2.A): serial Excel↔ISO, vacío, miles decimales, RIF/mayúsculas. */
export function normValue(v: string): string {
  const t = v.trim();
  if (/^-?\d+(\.\d+)?$/.test(t) && Number(t) > 20000 && Number(t) < 80000) {
    // Serial de fecha Excel → ISO (origen 1899-12-30).
    const d = new Date(Math.round((Number(t) - 25569) * 86400 * 1000));
    return d.toISOString().slice(0, 10);
  }
  if (/^-?[\d.,]+$/.test(t)) return t.replace(/\./g, "").replace(",", ".").replace(/^0+(?=\d)/, "");
  return t.toUpperCase();
}

/** Orden canónico de filas por columnas clave (fecha → factura), según práctica del contador. */
export function canonicalRows(rows: string[][], keyIdx: number[]): string[][] {
  return [...rows].sort((a, b) => {
    for (const i of keyIdx) {
      const d = (a[i] ?? "").localeCompare(b[i] ?? "");
      if (d !== 0) return d;
    }
    return 0;
  });
}

export type ApprovedDiff = { hoja: string; celda: string; clase: DiffKind; motivo: string; aprobador: string; vigencia: string };

/** Diferencias con aprobación vigente se apartan; el resto (incluido FORMATO) bloquea CI. */
export function applyApprovals(diffs: CellDiff[], approved: ApprovedDiff[], today = new Date().toISOString().slice(0, 10)): { open: CellDiff[]; approved: CellDiff[] } {
  const open: CellDiff[] = [];
  const done: CellDiff[] = [];
  for (const d of diffs) {
    const hit = approved.find((a) => a.hoja === d.hoja && a.celda === d.celda && a.clase === d.kind && today <= a.vigencia);
    if (hit) done.push(d);
    else open.push(d);
  }
  return { open, approved: done };
}

/** Neutralización de inyección de fórmulas para celdas escritas por el sistema. */
export function sanitizeCell(v: string): string {
  return /^[=+\-@]/.test(v) ? `'${v}` : v;
}

/** Informe legible para llevar al contador (evidencia M2). */
export function formatReport(diffs: CellDiff[]): string {
  const head = "| Hoja | Celda | Clase | Golden | ERP |";
  const lines = diffs.map((d) => `| ${d.hoja} | ${d.celda} | ${d.kind} | ${d.golden} | ${d.actual} |`);
  return [head, "|---|---|---|---|---|", ...lines].join("\n");
}

export type BitacoraClase = "D1" | "D2" | "D3" | "D4" | "D5";
export type GoldenDecision = {
  hoja: string;
  celda: string;
  kind?: DiffKind;
  clase: Exclude<BitacoraClase, "D1">;
  motivo: string;
  aprobador: string;
  fecha: string;
  vigencia: string;
  resolucion: "CORREGIR" | "JUSTIFICAR" | "APROBAR";
};
export type BitacoraRow = {
  n: number;
  hoja: string;
  celda: string;
  golden: string;
  actual: string;
  kind: DiffKind;
  clase: BitacoraClase;
  estado: "ABIERTA" | "APROBADA";
  magnitud: string;
  causaRaiz: string;
  resolucion: string;
  aprobador: string;
  fecha: string;
  motivo: string;
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Valida el registro de diferencias aprobadas. D1 nunca es aprobable: un error del sistema se corrige. */
export function parseDecisions(input: unknown): { decisions: GoldenDecision[]; errors: string[] } {
  const decisions: GoldenDecision[] = [];
  const errors: string[] = [];
  if (!Array.isArray(input)) return { decisions, errors: ["decisions debe ser un arreglo"] };
  input.forEach((d, i) => {
    const e = d as Partial<GoldenDecision>;
    const bad: string[] = [];
    if (typeof e.hoja !== "string" || !e.hoja) bad.push("hoja");
    if (typeof e.celda !== "string" || !e.celda) bad.push("celda");
    if (e.kind !== undefined && e.kind !== "ESTRUCTURA" && e.kind !== "VALOR" && e.kind !== "FORMATO") bad.push("kind");
    if (e.clase !== "D2" && e.clase !== "D3" && e.clase !== "D4" && e.clase !== "D5") bad.push("clase (D1 no aprobable)");
    if (typeof e.motivo !== "string" || !e.motivo) bad.push("motivo");
    if (typeof e.aprobador !== "string" || !e.aprobador) bad.push("aprobador");
    if (typeof e.fecha !== "string" || !ISO_DATE.test(e.fecha)) bad.push("fecha (YYYY-MM-DD)");
    if (typeof e.vigencia !== "string" || !ISO_DATE.test(e.vigencia)) bad.push("vigencia (YYYY-MM-DD)");
    if (e.resolucion !== "CORREGIR" && e.resolucion !== "JUSTIFICAR" && e.resolucion !== "APROBAR") bad.push("resolucion");
    if (bad.length > 0) errors.push(`decisions[${i}]: ${bad.join(", ")}`);
    else decisions.push(e as GoldenDecision);
  });
  return { decisions, errors };
}

/** Clase sugerida para filas sin aprobación: VALOR/ESTRUCTURA → D1 (bloquea); FORMATO → D4 (bloquea hasta tolerancia registrada). */
export function defaultBitacoraClass(kind: DiffKind): BitacoraClase {
  return kind === "FORMATO" ? "D4" : "D1";
}

function magnitud(golden: string, actual: string): string {
  const n = (x: string) => {
    const t = x.trim();
    if (!/^-?[\d.,]+$/.test(t)) return null;
    const v = Number(t.replace(/\./g, "").replace(",", "."));
    return Number.isFinite(v) ? v : null;
  };
  const g = n(golden);
  const a = n(actual);
  if (g === null || a === null) return "";
  return Math.abs(g - a).toFixed(2);
}

/** Construye la bitácora D1–D5. Solo una decisión vigente y exacta aparta una fila a APROBADA. */
export function buildBitacora(diffs: CellDiff[], decisions: GoldenDecision[], today = new Date().toISOString().slice(0, 10)): BitacoraRow[] {
  return diffs.map((d, i) => {
    const hit = decisions.find(
      (a) => a.hoja === d.hoja && a.celda === d.celda && (a.kind === undefined || a.kind === d.kind) && today <= a.vigencia,
    );
    if (hit) {
      return {
        n: i + 1, hoja: d.hoja, celda: d.celda, golden: d.golden, actual: d.actual, kind: d.kind,
        clase: hit.clase, estado: "APROBADA" as const, magnitud: magnitud(d.golden, d.actual),
        causaRaiz: hit.motivo, resolucion: hit.resolucion, aprobador: hit.aprobador, fecha: hit.fecha, motivo: hit.motivo,
      };
    }
    const clase = defaultBitacoraClass(d.kind);
    return {
      n: i + 1, hoja: d.hoja, celda: d.celda, golden: d.golden, actual: d.actual, kind: d.kind,
      clase, estado: "ABIERTA" as const, magnitud: magnitud(d.golden, d.actual),
      causaRaiz: "", resolucion: clase === "D4" ? "JUSTIFICAR" : "CORREGIR", aprobador: "", fecha: "", motivo: "",
    };
  });
}

/** Bitácora en el formato de `docs/anexos/bitacora-diferencias.md`. */
export function formatBitacora(rows: BitacoraRow[]): string {
  const head = "| # | Hoja/celda | Golden | ERP | Clase | Magnitud | Causa raíz | Resolución | Aprobador | Fecha |";
  const lines = rows.map((r) =>
    `| ${r.n} | ${r.hoja} ${r.celda} | ${r.golden} | ${r.actual} | ${r.clase} (${r.estado}) | ${r.magnitud} | ${r.causaRaiz} | ${r.resolucion} | ${r.aprobador} | ${r.fecha} |`,
  );
  return [head, "|---|---|---|---|---|---|---|---|---|---|", ...lines].join("\n");
}

export function bitacoraCsv(rows: BitacoraRow[]): string {
  const q = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const head = ["n", "hoja", "celda", "golden", "actual", "kind", "clase", "estado", "magnitud", "causa_raiz", "resolucion", "aprobador", "fecha", "motivo"];
  const lines = rows.map((r) =>
    [r.n, r.hoja, r.celda, r.golden, r.actual, r.kind, r.clase, r.estado, r.magnitud, r.causaRaiz, r.resolucion, r.aprobador, r.fecha, r.motivo].map(q).join(","),
  );
  return [head.map(q).join(","), ...lines].join("\n");
}

export type GoldenInventorySheet = {
  name: string;
  rowCount: number;
  columnCount: number;
  mergedCount: number;
  formulaCount: number;
  refErrorCount: number;
  orientation?: string;
  paperSize?: string;
};
export type GoldenInventory = { sha256: string; sheets: GoldenInventorySheet[] };

/**
 * Inventario estructural de un xlsx candidato a golden SIN exponer valores de celdas.
 * Solo conteos, dimensiones, fusiones, fórmulas y errores `#REF!`. No registra PII.
 */
export async function inspectGolden(filePath: string): Promise<GoldenInventory> {
  const buf = readFileSync(filePath);
  const sha256 = createHash("sha256").update(buf).digest("hex");
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf as unknown as ArrayBuffer);
  const sheets: GoldenInventorySheet[] = [];
  for (const ws of wb.worksheets) {
    let formulaCount = 0;
    let refErrorCount = 0;
    ws.eachRow((row) => {
      row.eachCell((cell) => {
        const v = cell.value as unknown;
        if (v !== null && typeof v === "object" && "formula" in (v as Record<string, unknown>)) {
          formulaCount++;
          const f = String((v as { formula?: unknown }).formula ?? "");
          const r = (v as { result?: unknown }).result;
          if (f.includes("#REF!") || r === "#REF!" || String(r ?? "").includes("#REF!")) refErrorCount++;
        }
      });
    });
    const merges = ((ws.model.merges ?? []) as unknown[]).length;
    const setup = (ws.pageSetup ?? {}) as { orientation?: string; paperSize?: number };
    sheets.push({
      name: ws.name,
      rowCount: ws.rowCount,
      columnCount: ws.columnCount,
      mergedCount: merges,
      formulaCount,
      refErrorCount,
      orientation: setup.orientation ?? "",
      paperSize: setup.paperSize === undefined ? "" : String(setup.paperSize),
    });
  }
  return { sha256, sheets };
}
