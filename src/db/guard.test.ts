import { afterEach, describe, expect, it } from "vitest";
import { seedGuard } from "./guard";

describe("guardias de arranque (2.0.5)", () => {
  const OLD = { ...process.env } as Record<string, string | undefined>;
  const setEnv = (k: string, v: string | undefined) => {
    (process.env as Record<string, string | undefined>)[k] = v;
  };
  afterEach(() => {
    setEnv("NODE_ENV", OLD.NODE_ENV);
    delete process.env.INITIAL_ADMIN_EMAIL;
    delete process.env.INITIAL_ADMIN_PASSWORD;
    if (OLD.INITIAL_ADMIN_EMAIL) setEnv("INITIAL_ADMIN_EMAIL", OLD.INITIAL_ADMIN_EMAIL);
    if (OLD.INITIAL_ADMIN_PASSWORD) setEnv("INITIAL_ADMIN_PASSWORD", OLD.INITIAL_ADMIN_PASSWORD);
  });

  it("niega seeds en producción y permite en dev", () => {
    setEnv("NODE_ENV", "production");
    setEnv("INITIAL_ADMIN_EMAIL", "a@b.c");
    expect(() => seedGuard()).toThrow(/producción/);
    delete process.env.INITIAL_ADMIN_EMAIL;
    delete process.env.INITIAL_ADMIN_PASSWORD;
    expect(() => seedGuard()).not.toThrow();
  });
});
