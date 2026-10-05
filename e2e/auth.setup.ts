import { test as setup } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { ROLES, loginUI, type Rol } from "./helpers";

/** Setup: autentica cada rol por UI y guarda su sesión (los specs cargan storageState).
 * Sin reloj controlado aquí: congelar timers rompe la hidratación del login;
 * el reloj se instala en cada spec antes de navegar (ver helpers.conReloj). */
setup("autenticar roles", async ({ page }) => {
  mkdirSync(join(__dirname, ".auth"), { recursive: true });
  for (const rol of ROLES) {
    await loginUI(page, rol as Rol);
    await page.context().storageState({ path: join(__dirname, ".auth", `${rol}.json`) });
    // Limpia la sesión para el siguiente rol (logout por cookie: cierra contexto).
    await page.context().clearCookies();
    await page.goto("/login");
  }
});
