import { describe, expect, it } from "vitest";
import { sessionCookieFlags } from "./session";
import { env } from "@/lib/env";

/** Regresión: el login redirigía a /login porque la cookie __Host- se enviaba sin Secure. */
describe("cookie de sesión", () => {
  it("respeta requisitos __Host- (Secure + Path=/) y expira", () => {
    const flags = sessionCookieFlags();
    if (env.SESSION_COOKIE_NAME.startsWith("__Host-")) expect(flags.secure).toBe(true);
    expect(flags.httpOnly).toBe(true);
    expect(flags.path).toBe("/");
    expect(flags.sameSite).toBe("lax");
    expect(flags.maxAge).toBeGreaterThan(0);
  });
});
