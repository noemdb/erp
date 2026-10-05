import { test, expect, request } from "@playwright/test";
import { join } from "node:path";
import { conReloj, leerCtx } from "./helpers";

/** ACC-06 negativos + seguridad (lectura y denegación; sin tocar datos). */
test.beforeEach(async ({ page }) => {
  await conReloj(page);
});

test.describe("S1 aislamiento entre empresas", () => {
  test.use({ storageState: join(__dirname, ".auth", "auditor.json") });
  test("empresa sin membresía redirige al panel", async ({ page }) => {
    const { companyBId } = leerCtx();
    await page.goto(`/c/${companyBId}/compras`);
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });
    await expect(page.getByText("Empresa E2E-B").first()).toBeHidden();
  });
});

test.describe("S2 sin sesión", () => {
  test("API de reportes responde 401", async ({ baseURL }) => {
    const { demoCompanyId: id } = leerCtx();
    const ctx = await request.newContext();
    const r = await ctx.get(`${baseURL}/api/companies/${id}/reports/purchase-book`);
    expect(r.status()).toBe(401);
    await ctx.dispose();
  });
  test("página interna redirige al login", async ({ browser }) => {
    const ctx = await browser.newContext(); // sin storageState
    const page = await ctx.newPage();
    const { demoCompanyId: id } = leerCtx();
    await page.goto(`/c/${id}/compras`);
    await expect(page).toHaveURL(/\/login/, { timeout: 30_000 });
    await ctx.close();
  });
});

test("S3 rate-limit de login tras 6 intentos", async ({ page }) => {
  await page.goto("/login");
  for (let i = 0; i < 6; i++) {
    await page.getByLabel("Correo").fill("ratelimit-e2e@test.local");
    await page.getByRole("textbox", { name: "Contraseña" }).fill(`mala-${i}`);
    await page.getByRole("button", { name: "Entrar" }).click();
    await page.waitForTimeout(400);
  }
  // 1–5: credenciales inválidas; 6.º: bloqueado por un minuto.
  await expect(page.locator("form").getByRole("alert")).toContainText("Demasiados intentos");
});
