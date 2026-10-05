import { test, expect } from "@playwright/test";
import { join } from "node:path";
import { ROLES, conReloj, type Rol } from "./helpers";

/** Humo por rol: sesión válida ve su empresa; credencial mala ve alerta (1 intento, sin abusar del rate-limit). */
test.beforeEach(async ({ page }) => {
  await conReloj(page);
});

for (const rol of ROLES) {
  test.describe(`rol ${rol}`, () => {
    test.use({ storageState: join(__dirname, ".auth", `${rol}.json`) });
    test("dashboard con contexto de empresa", async ({ page }) => {
      await page.goto("/dashboard");
      await expect(page.getByText("Resumen fiscal").first()).toBeVisible({ timeout: 30_000 });
      await expect(page.getByRole("heading", { name: /Empresa Demo/ })).toBeVisible();
      await expect(page.getByLabel("Correo")).toBeHidden(); // no devolvió al login
    });
  });
}

test("credencial inválida muestra alerta y no entra", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Correo").fill("nadie@test.local");
  await page.getByRole("textbox", { name: "Contraseña" }).fill("clave-mala");
  await page.getByRole("button", { name: "Entrar" }).click();
  // Acotada al formulario: la página tiene otra región alert fuera de él.
  await expect(page.locator("form").getByRole("alert")).toContainText("Credenciales inválidas");
  await expect(page).toHaveURL(/\/login/);
});
