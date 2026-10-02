import { describe, expect, it } from "vitest";
import { Writable } from "node:stream";
import pino from "pino";

describe("logs sin PII (SECURITY.md)", () => {
  it("redacta credenciales, RIF y correo", async () => {
    let out = "";
    const sink = new Writable({ write: (c, _e, cb) => { out += c.toString(); cb(); } });
    const log = pino({ redact: { paths: ["password", "email", "rif", "*.password"], censor: "[redactado]" } }, sink);
    log.info({ email: "a@b.com", rif: "J-1", password: "secreto", total: "116.00" }, "emisión"); // secrets:allow (dato sintético de prueba)
    await new Promise((r) => setTimeout(r, 50));
    expect(out).not.toContain("secreto");
    expect(out).not.toContain("a@b.com");
    expect(out).not.toContain("J-1");
    expect(out).toContain("116.00");
    expect(out).toContain("[redactado]");
  });
});
