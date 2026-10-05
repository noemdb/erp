import { test, expect } from "@playwright/test";
import { join } from "node:path";
import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { conReloj, leerCtx, sello } from "./helpers";

/**
 * ACC-06 recorridos P0 (escrituras mínimas y marcadas E2E- en BD de dev;
 * sin confirmación de import ni emisión fiscal: eso llega con muestras en ACC-11).
 */
test.beforeEach(async ({ page }) => {
  await conReloj(page);
});

test.describe("J1 compra manual (contador)", () => {
  test.use({ storageState: join(__dirname, ".auth", "contador.json") });
  test("nueva → guarda → visible en lista", async ({ page }) => {
    const { demoCompanyId: id } = leerCtx();
    const s = sello();
    const factura = `F-E2E-${s}`;
    await page.goto(`/c/${id}/compras/nueva`);
    // Nota: varios inputs del formulario no tienen `id` (el label no los asocia);
    // se ubican por nombre/placeholder (deuda a11y menor, fuera de este bloque).
    await page.getByPlaceholder("J-12345678-9").fill(`J-9${s.slice(-7)}-0`);
    await page.locator('input[name="partyRazon"]').fill("Proveedor E2E CA");
    await page.locator('input[name="docNumber"]').fill(factura);
    await page.locator('input[name="controlNumber"]').fill(`C-E2E-${s}`);
    await page.locator('input[name="fechaDocumento"]').fill("2026-10-05");
    await page.locator('input[name="fechaFiscal"]').fill("2026-10-05");
    await page.locator("#base-0").fill("1000.00");
    await page.locator("#iva-0").fill("160.00");
    await page.locator("#total").fill("1160.00");
    await expect(page.getByText("Cuadra Inv.1")).toBeVisible();
    await page.getByRole("button", { name: "Guardar compra" }).click();
    await page.waitForURL(/\/compras$/, { timeout: 30_000 });
    await expect(page.getByText(factura).first()).toBeVisible();
  });
});

test.describe("J2 importación preview (administrativo)", () => {
  test.use({ storageState: join(__dirname, ".auth", "administrativo.json") });
  test("sube CSV → lote clasificado con advertencia de tercero nuevo (sin confirmar)", async ({ page }) => {
    const { demoCompanyId: id } = leerCtx();
    const s = sello();
    const csv = [
      "fecha,rif,razon_social,factura,control,base_imponible,iva,total",
      `05/10/2026,J-98888888-8,Proveedor E2E CA,F-E2EI-${s},C-E2EI-${s},1000.00,160.00,1160.00`,
    ].join("\n");
    const path = join(tmpdir(), `e2e-${s}.csv`);
    writeFileSync(path, csv);
    await page.goto(`/c/${id}/importaciones/nueva`);
    await page.locator('input[type="file"]').setInputFiles(path);
    await page.getByRole("button", { name: "Subir" }).click();
    await page.waitForURL(/\/importaciones\/[^/]+$/, { timeout: 60_000 });
    // El lote nace en `uploaded`: hay que validar filas antes de clasificarlas.
    await page.getByRole("button", { name: "Validar filas" }).click();
    // RIF desconocido ⇒ advertencia honesta de tercero nuevo (0 rechazadas).
    await expect(page.getByText("Filas válidas: 0 de 1")).toBeVisible({ timeout: 60_000 });
    await expect(page.locator('section[aria-label="Contadores del lote"]')).toContainText("Advertencias");
  });
});

test.describe("J3 reglas por rol", () => {
  test("auditor: solo lectura, sin crear", async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: join(__dirname, ".auth", "auditor.json") });
    const page = await ctx.newPage();
    await conReloj(page);
    const { demoCompanyId: id } = leerCtx();
    await page.goto(`/c/${id}/reglas`);
    await expect(page.getByText("es de solo lectura aquí").first()).toBeVisible();
    await page.goto(`/c/${id}/reglas/nueva`);
    await expect(page.getByText("Los borradores los crea el contador")).toBeVisible();
    await ctx.close();
  });
  test("contador: ve el formulario de borrador", async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: join(__dirname, ".auth", "contador.json") });
    const page = await ctx.newPage();
    await conReloj(page);
    const { demoCompanyId: id } = leerCtx();
    await page.goto(`/c/${id}/reglas/nueva`);
    await expect(page.getByRole("heading", { name: "Nuevo borrador de regla" })).toBeVisible();
    await ctx.close();
  });
});
