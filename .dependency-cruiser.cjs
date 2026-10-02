/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "tax-engine-sin-infra",
      severity: "error",
      from: { path: "src/modules/tax-engine" },
      to: { path: "src/modules/(identity|tenancy|imports|withholdings|periods|reporting|audit)" },
    },
    {
      name: "solo-repo-toca-db",
      severity: "error",
      from: { pathNot: "src/modules/[^/]+/repo" },
      to: { path: "src/db" },
    },
  ],
  options: { tsPreCompilationDeps: true },
};
