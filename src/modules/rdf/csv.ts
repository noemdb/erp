/** CSV de decisiones fiscales. Neutraliza inyección (=+-@, tab/CR) como audit/export. */
export type DecisionCsvRow = {
  codigo: string;
  estado: string;
  gap: string;
  titulo: string;
  resultadoEsperado: string;
  firmante: string;
  firmadoEn: string;
  sha256: string;
};

export const DECISIONES_CSV_HEAD = "codigo,estado,gap,titulo,resultado_esperado,firmante,firmado_en,sha256";

export function rdfCell(v: string): string {
  const t = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
  return `"${t.replace(/"/g, '""')}"`;
}

export function toDecisionesCsv(rows: DecisionCsvRow[]): string {
  const lines = rows.map((r) =>
    [r.codigo, r.estado, r.gap, r.titulo, r.resultadoEsperado, r.firmante, r.firmadoEn, r.sha256].map(rdfCell).join(","),
  );
  return `\uFEFF${DECISIONES_CSV_HEAD}\n${lines.join("\n")}${lines.length > 0 ? "\n" : ""}`;
}
