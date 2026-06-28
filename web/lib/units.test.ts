import { describe, it, expect } from "vitest";
import { xlmToStroops, stroopsToXlm } from "./units";

describe("xlmToStroops", () => {
  it("converts whole XLM to stroops (7 decimals)", () => {
    expect(xlmToStroops("1")).toBe(10_000_000n);
    expect(xlmToStroops(5)).toBe(50_000_000n);
  });

  it("handles fractional amounts and pads to 7 decimals", () => {
    expect(xlmToStroops("0.5")).toBe(5_000_000n);
    expect(xlmToStroops("1.2345678")).toBe(12_345_678n);
  });

  it("truncates beyond 7 decimals instead of rounding", () => {
    expect(xlmToStroops("0.12345678")).toBe(1_234_567n);
  });

  it("treats empty/zero input as zero", () => {
    expect(xlmToStroops("")).toBe(0n);
    expect(xlmToStroops("0")).toBe(0n);
  });
});

describe("stroopsToXlm", () => {
  it("converts stroops back to a trimmed XLM string", () => {
    expect(stroopsToXlm(10_000_000n)).toBe("1");
    expect(stroopsToXlm(5_000_000n)).toBe("0.5");
    expect(stroopsToXlm(12_345_678n)).toBe("1.2345678");
  });

  it("handles negative amounts", () => {
    expect(stroopsToXlm(-5_000_000n)).toBe("-0.5");
  });

  it("round-trips with xlmToStroops", () => {
    for (const v of ["1", "0.5", "123.4567891", "0.0000001"]) {
      expect(stroopsToXlm(xlmToStroops(v))).toBe(v);
    }
  });
});
