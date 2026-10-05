import { defineConfig, devices } from "@playwright/test";

/**
 * ACC-05: arnés E2E por rol (recorridos P0 llegan en ACC-06; aquí arnés + humo).
 * - Un worker: la suite comparte la BD de dev y el rate-limit de login es 5/min.
 * - Reloj controlado por test (ver e2e/helpers.ts `conReloj`), nunca Date.now del host.
 * - Navegador: chromium empaquetado (`npm run e2e:install`); con E2E_CHANNEL=chrome
 *   usa el Chrome del host (útil en dev, sin descarga).
 */
const PORT = Number(process.env.E2E_PORT ?? 3110);

export default defineConfig({
  testDir: "e2e",
  testMatch: ["**/*.spec.ts"],
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 120_000,
  expect: { timeout: 15_000 },
  use: {
    // localhost, no 127.0.0.1: el dev server bloquea cross-origin en HMR/Flight
    // (allowedDevOrigins) y sin hidratación el login cae a GET con la clave en la URL.
    baseURL: `http://localhost:${PORT}`,
    screenshot: "only-on-failure",
    video: "off",
    trace: "off",
    ...(process.env.E2E_CHANNEL ? { channel: process.env.E2E_CHANNEL as "chrome" } : {}),
  },
  webServer: {
    command: `npx next dev -p ${PORT}`,
    url: `http://localhost:${PORT}/login`,
    reuseExistingServer: true,
    timeout: 240_000,
    env: { ...process.env, PORT: String(PORT) } as Record<string, string>,
  },
  projects: [
    { name: "setup", testMatch: ["auth.setup.ts"] },
    { name: "chromium", dependencies: ["setup"], use: { ...devices["Desktop Chrome"] } },
  ],
});
