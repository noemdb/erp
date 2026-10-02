/** 2.0.2 ítem 1: valida paquete y crea BORRADORES vía servicio (nunca activa). Uso: npx tsx scripts/load-catalog-pack.ts <pack.json> <companyId> <userId> */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv from "ajv";
import { db } from "../src/db/client";
import { withholdingConcepts } from "../src/db/schema";
import { createDraft } from "../src/modules/rules/service";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const _packPath = process.argv[2];
const _companyId = process.argv[3];
const _userId = process.argv[4];
if (!_packPath || !_companyId || !_userId) {
  console.error("uso: load-catalog-pack.ts <pack.json> <companyId> <userId>");
  process.exit(1);
}
const packPath: string = _packPath;
const companyId: string = _companyId;
const userId: string = _userId;

async function main() {
  const schema = JSON.parse(readFileSync(join(root, "fixtures/catalog-pack-schema.json"), "utf8"));
  const pack = JSON.parse(readFileSync(packPath, "utf8")) as {
    version: string; fechaCorte: string; reglas: Record<string, string>[];
  };
  const ajv = new Ajv({ allErrors: true });
  if (!ajv.compile(schema)(pack)) {
    console.error("paquete inválido:", ajv.errorsText(ajv.errors));
    process.exit(1);
  }
  const concepts = await db.select().from(withholdingConcepts);
  const need = (v: string | undefined, what: string): string => {
    if (!v) {
      console.error(`paquete inválido: falta ${what}`);
      process.exit(1);
    }
    return v;
  };
  let n = 0;
  for (const r of pack.reglas) {
    let conceptId: string | null = null;
    if (r.conceptCodigo) {
      const found = concepts.find((c) => c.codigo === r.conceptCodigo && (c.companyId === null || c.companyId === companyId));
      if (!found) {
        console.error(`concepto inexistente: ${r.conceptCodigo} (créalo primero)`);
        process.exit(1);
      }
      conceptId = found.id;
    }
    const res = await createDraft(
      { companyId, userId },
      {
        ruleKind: need(r.kind, "kind") as "iva" | "islr",
        conceptId,
        effectiveFrom: need(r.vigenciaDesde, "vigenciaDesde"),
        porcentaje: need(r.porcentaje, "porcentaje"),
        sustraendo: r.sustraendo ?? "0",
        baseFormulaKind: need(r.base, "base"),
        legalReference: `${need(r.fuente, "fuente")} art. ${need(r.articulo, "articulo")}`,
        changeReason: `pack ${pack.version} (${pack.fechaCorte})`,
        synthetic: true,
      },
    );
    if (!res.ok) {
      console.error(`fila rechazada (${r.kind}/${r.conceptCodigo ?? "—"}): ${res.error.code} ${res.error.message}`);
      process.exit(1);
    }
    n++;
  }
  console.log(`${n} borradores sintéticos creados (pendientes de revisión/aprobación/activación)`);
  process.exit(0);
}
main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
