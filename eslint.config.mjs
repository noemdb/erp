import next from "eslint-config-next";
import boundaries from "eslint-plugin-boundaries";

const config = [
  ...next,
  {
    plugins: { boundaries: boundaries },
    settings: {
      "boundaries/elements": [
        { type: "identity", pattern: "src/modules/identity/*" },
        { type: "tenancy", pattern: "src/modules/tenancy/*" },
        { type: "parties", pattern: "src/modules/parties/*" },
        { type: "fiscal-docs", pattern: "src/modules/fiscal-docs/*" },
        { type: "tax-engine", pattern: "src/modules/tax-engine/*" },
        { type: "imports", pattern: "src/modules/imports/*" },
        { type: "withholdings", pattern: "src/modules/withholdings/*" },
        { type: "periods", pattern: "src/modules/periods/*" },
        { type: "reporting", pattern: "src/modules/reporting/*" },
        { type: "audit", pattern: "src/modules/audit/*" },
        { type: "app", pattern: "src/app/**/*" },
      ],
      "boundaries/ignore": ["**/*.test.ts", "**/*.spec.ts"],
    },
    rules: {
      // tax-engine puro: sin infraestructura
      "boundaries/element-types": [
        "error",
        {
          default: "allow",
          rules: [{ from: "tax-engine", disallow: ["identity", "tenancy", "app"], message: "tax-engine no importa infraestructura" }],
        },
      ],
      "no-restricted-imports": "off",
    },
  },
  {
    // UI nunca toca DB: solo Server Actions de módulos (CONVENTIONS.md)
    files: ["src/app/**/*"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: ["@/db/*"], message: "UI no importa DB. Usa Server Actions de modules/*/repo vía withTenant." },
          ],
        },
      ],
    },
  },
  {
    // Motor puro: sin DB (ADR-004)
    files: ["src/modules/tax-engine/**/*"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [{ group: ["@/db/*"], message: "tax-engine es puro, sin infraestructura." }],
        },
      ],
    },
  },
  {
    // Tests pueden sembrar/limpiar vía db directo
    files: ["**/*.test.ts"],
    rules: { "no-restricted-imports": "off" },
  },
  {
    // Route Handlers (descargas) corren en servidor: pueden usar módulos con DB
    files: ["src/app/api/**/*"],
    rules: { "no-restricted-imports": "off" },
  },
];

export default config;
