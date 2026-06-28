import { describe, it, expect } from "vitest";
import { truncateAddress, formatXlm } from "./format";

const G = "GABC1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLMWXYZ";

describe("truncateAddress", () => {
  it("shortens a long Stellar address with an ellipsis", () => {
    expect(truncateAddress(G)).toBe("GABC…WXYZ");
  });

  it("respects custom lead/tail lengths", () => {
    expect(truncateAddress(G, 6, 6)).toBe(`${G.slice(0, 6)}…${G.slice(-6)}`);
  });

  it("leaves short strings untouched", () => {
    expect(truncateAddress("GABC")).toBe("GABC");
  });
});

describe("formatXlm", () => {
  it("formats with thousands separators", () => {
    expect(formatXlm("1234.5")).toBe("1,234.5");
  });

  it("trims trailing zeros up to 7 decimals", () => {
    expect(formatXlm("1.5000000")).toBe("1.5");
  });

  it("returns 0 for non-finite input", () => {
    expect(formatXlm("not-a-number")).toBe("0");
  });
});
