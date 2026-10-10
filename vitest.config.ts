import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  // PostCSS inline vacío: los tests nunca procesan CSS y así no se lee
  // postcss.config.mjs (cuya forma string, exigida por Next/webpack,
  // no la resuelve el loader de Vite).
  css: { postcss: { plugins: [] } },
  test: {
    environment: "node",
    testTimeout: 60000,
    // Los tests nunca procesan CSS (redundante con css.postcss vacío).
    css: false,
    // Los specs e2e/* son de Playwright (`npm run e2e`); vitest los excluye
    // para no reportarlos como fallos de runner (B35).
    exclude: ["e2e/**", "node_modules/**"],
  },
});
