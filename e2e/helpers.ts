import type { Page } from "@playwright/test";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { ROLES, emailDe, type Rol } from "./seed";

/** Reloj controlado: congela el navegador en una fecha fija (determinismo, sin Date.now del host). */
export const HORA_FIJA = new Date("2026-10-05T12:00:00-04:00");

export async function conReloj(page: Page, hora: Date = HORA_FIJA) {
  await page.clock.install({ time: hora });
}

export function claveE2E(): string {
  const pw = process.env.E2E_PASSWORD ?? "";
  if (!pw) throw new Error("E2E_PASSWORD sin definir (ver e2e/seed.ts).");
  return pw;
}

/** Login por UI real (ruta verdadera, no atajo): /login → redirige a /c/… o /dashboard. */
export async function loginUI(page: Page, rol: Rol) {
  await page.goto("/login");
  await page.getByLabel("Correo").fill(emailDe(rol));
  // textbox (no getByLabel): el botón "Mostrar contraseña" comparte el label accesible.
  await page.getByRole("textbox", { name: "Contraseña" }).fill(claveE2E());
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL(/\/(c\/|dashboard)/, { timeout: 30_000 });
}

export { ROLES, emailDe, type Rol };
export const AUTH_DIR = ".auth";

/** IDs del seed (`npm run e2e:seed` escribe e2e/.ctx.json). CWD = raíz del repo. */
export function leerCtx(): { demoCompanyId: string; companyBId: string } {
  const p = join(process.cwd(), "e2e", ".ctx.json");
  if (!existsSync(p)) throw new Error("falta e2e/.ctx.json: corre npm run e2e:seed primero.");
  return JSON.parse(readFileSync(p, "utf8"));
}

/** Sufijo único por corrida para documentos e2e (evita DUPLICATE_DOCUMENT entre corridas). */
export function sello(): string {
  return Date.now().toString(36).toUpperCase();
}
