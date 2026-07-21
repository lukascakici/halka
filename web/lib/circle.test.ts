import { describe, it, expect } from "vitest";
import type { CircleConfig } from "@circle-client";
import { statusOf, isActive, hasEnded } from "./circle";

/** A config carrying just the status the UI branches on. */
function withStatus(tag: "Open" | "Active" | "Finished" | "Cancelled") {
  return { status: { tag, values: undefined } } as unknown as CircleConfig;
}

describe("circle status", () => {
  it("reads the tag off the contract's tagged union", () => {
    expect(statusOf(withStatus("Open"))).toBe("Open");
    expect(statusOf(withStatus("Cancelled"))).toBe("Cancelled");
  });

  it("treats only Active as running", () => {
    expect(isActive(withStatus("Active"))).toBe(true);
    for (const tag of ["Open", "Finished", "Cancelled"] as const) {
      expect(isActive(withStatus(tag))).toBe(false);
    }
  });

  // Collateral is withdrawable exactly when the circle has come to rest, so
  // this predicate gates real money moving back to members.
  it("treats Finished and Cancelled as ended", () => {
    expect(hasEnded(withStatus("Finished"))).toBe(true);
    expect(hasEnded(withStatus("Cancelled"))).toBe(true);
    expect(hasEnded(withStatus("Open"))).toBe(false);
    expect(hasEnded(withStatus("Active"))).toBe(false);
  });
});
