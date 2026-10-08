import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { contentHash } from "../shared/canonical";
import { executeGoldenCase, type GoldenScenario } from "./service";

/**
 * Firma autenticada por el sistema (Opción 1 del spec `blueprint/goldenValidation/` §7).
 * Provisional: la fuente de verdad sigue siendo `fixtures/tax-scenarios/*.json`; la firma se
 * escribe en el propio archivo con identidad del usuario de sesión + rol `contador` + hash.
 * El diseño definitivo (DB `golden_cases`/`golden_signatures`, trigger, RLS, Ed25519) queda
 * para cuando el contador decida ADR-035.
 */
export const DIR = join(process.cwd(), "fixtures", "tax-scenarios");

export const SignSchema = z.object({
  firmanteNombre: z.string().trim().min(3).max(120),
  firmanteDoc: z.string().trim().min(6).max(20),
  fuenteLegal: z.string().trim().min(5).max(300),
});

export type SignInput = z.input<typeof SignSchema>;

export type SignResult =
  | { ok: true; id: string; contentSha256: string; algoritmo: string }
  | { ok: false; error: { code: string; message: string } };

const fail = (code: string, message: string): SignResult => ({ ok: false, error: { code, message } });

/** Busca el archivo cuyo `id` interno coincide (el nombre de archivo puede diferir). */
function fileForId(dir: string, id: string): string | null {
  for (const f of readdirSync(dir)) {
    if (!f.endsWith(".json") || f.startsWith("_") || f === "schema.json") continue;
    try {
      const s = JSON.parse(readFileSync(join(dir, f), "utf8")) as { id?: string };
      if (s.id === id) return join(dir, f);
    } catch {
      /* archivo corrupto: se ignora */
    }
  }
  return null;
}

export function signGoldenCase(id: string, userId: string, raw: SignInput, dir: string = DIR): SignResult {
  const parsed = SignSchema.safeParse(raw);
  if (!parsed.success) return fail("VALIDATION_ERROR", parsed.error.issues[0]!.message);

  const file = fileForId(dir, id);
  if (!file) return fail("NOT_FOUND", "Dorado no existe.");
  const scenario = JSON.parse(readFileSync(file, "utf8")) as GoldenScenario;

  // RG-02: lo firmado no se vuelve a firmar.
  if (scenario.estado === "VALIDADO_CONTADOR") return fail("GOLDEN_ALREADY_SIGNED", "Este dorado ya está firmado.");

  // RG-03: no se firma lo que el motor no reproduce.
  const exec = executeGoldenCase(scenario);
  if (!exec.pass)
    return fail("GOLDEN_NOT_REPRODUCED", `El motor no reproduce el esperado: ${exec.diff ?? "sin detalle"}.`);

  // El hash cubre el contenido (con estado=VALIDADO_CONTADOR), sin el bloque `firma`.
  const base = { ...scenario, estado: "VALIDADO_CONTADOR" as const };
  const { firma: _old, ...sinFirma } = base;
  void _old;
  const contentSha256 = contentHash(sinFirma);

  const signed: GoldenScenario = {
    ...base,
    firma: {
      algoritmo: "hmac-sha256",
      key_id: "system-session",
      firmado_por: parsed.data.firmanteNombre.trim(),
      firmado_por_user_id: userId,
      firmante_doc: parsed.data.firmanteDoc.trim(),
      fecha: new Date().toISOString().slice(0, 10),
      fuente_legal: parsed.data.fuenteLegal.trim(),
      firmado_en: new Date().toISOString(),
      sha256_contenido: contentSha256,
    },
  };

  writeFileSync(file, `${JSON.stringify(signed, null, 2)}\n`, "utf8");
  return { ok: true, id, contentSha256, algoritmo: "hmac-sha256" };
}
