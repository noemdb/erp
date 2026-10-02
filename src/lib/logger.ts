import pino from "pino";

/** Logs estructurados sin PII/secretos (SECURITY.md). Claves sensibles se redactan. */
export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  redact: {
    paths: [
      "password",
      "passwordHash",
      "token",
      "tokenHash",
      "email",
      "rif",
      "razonSocial",
      "*.password",
      "*.passwordHash",
      "*.token",
      "*.email",
      "*.rif",
    ],
    censor: "[redactado]",
  },
});
