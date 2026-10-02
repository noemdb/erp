/** Parser CSV robusto (cuestionario §6): separador, BOM, decimales coma/punto, fechas múltiples, nulos. */

/** Valores que significan "vacío", nunca dato. "0" NO es nulo (IVA 0 es válido). */
const NULLS = new Set(["", "n/a", "na", "n/d", "nd", "*", "-", "null", "s/n"]);

export function isNullish(v: string): boolean {
  return NULLS.has(v.trim().toLowerCase());
}

export function detectSeparator(header: string): string {
  const counts: Record<string, number> = { ",": 0, ";": 0, "\t": 0 };
  let inQ = false;
  for (const ch of header) {
    if (ch === '"') inQ = !inQ;
    else if (!inQ && ch in counts) counts[ch]!++;
  }
  return (Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? ",") as string;
}

/** Split de línea respetando comillas dobles. */
export function splitLine(line: string, sep: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else inQ = !inQ;
    } else if (ch === sep && !inQ) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out.map((c) => c.trim());
}

/** "1.234,56" | "1,234.56" | "1234,56" | "1234.56" → "1234.56". null si no numérico. */
export function normalizeDecimal(raw: string): string | null {
  const v = raw.trim();
  if (isNullish(v)) return null;
  const neg = v.startsWith("-");
  const t = neg ? v.slice(1) : v;
  const hasDot = t.includes(".");
  const hasComma = t.includes(",");
  let canon: string;
  if (hasDot && hasComma) {
    const lastDot = t.lastIndexOf(".");
    const lastComma = t.lastIndexOf(",");
    canon = (lastComma > lastDot ? t.replace(/\./g, "").replace(",", ".") : t.replace(/,/g, ""));
  } else if (hasComma) {
    canon = t.replace(/\./g, "").replace(",", ".");
  } else {
    canon = t.replace(/,/g, "");
  }
  if (!/^\d+(\.\d{1,6})?$/.test(canon)) return null;
  return (neg ? "-" : "") + canon;
}

function pad(n: string): string {
  return n.padStart(2, "0");
}

/** DD/MM/YYYY | DD-MM-YYYY | YYYY-MM-DD → YYYY-MM-DD. null si inválida. */
export function normalizeDate(raw: string): string | null {
  const v = raw.trim();
  if (isNullish(v)) return null;
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(v);
  if (m) return `${m[1]}-${pad(m[2]!)}-${pad(m[3]!)}`;
  m = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(v);
  if (m) {
    const [d, mo, y] = [Number(m[1]), Number(m[2]), Number(m[3])];
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
    return `${y}-${pad(String(mo))}-${pad(String(d))}`;
  }
  return null;
}

export type ParsedCsv = { headers: string[]; separator: string; rows: string[][] };

export function parseCsv(bytes: Buffer): ParsedCsv {
  const text = bytes.toString("utf8").replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  const lines = text.split("\n").filter((l) => l.trim() !== "");
  if (lines.length === 0) throw { code: "EMPTY_FILE", message: "Sin filas." };
  const separator = detectSeparator(lines[0]!);
  const headers = splitLine(lines[0]!, separator).map((h) => h.toLowerCase());
  return { headers, separator, rows: lines.slice(1).map((l) => splitLine(l, separator)) };
}
