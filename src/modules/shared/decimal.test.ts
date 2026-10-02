import { describe, expect, it } from "vitest";
import Decimal from "decimal.js";

describe("tooling smoke (ADR-003: dinero con decimal, jamás float)", () => {
  it("0.1 + 0.2 = 0.3 exacto", () => {
    expect(new Decimal("0.1").plus("0.2").toString()).toBe("0.3");
  });
});
