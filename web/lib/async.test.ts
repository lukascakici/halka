import { describe, it, expect } from "vitest";
import { isBadSeq, withSeqRetry, pollUntilChanged } from "./async";

describe("isBadSeq", () => {
  it("detects the stale-sequence error in various shapes", () => {
    expect(isBadSeq(new Error("tx failed: txBadSeq"))).toBe(true);
    expect(isBadSeq({ message: "bad sequence number" })).toBe(true);
    expect(isBadSeq({ result: { code: "bad_seq" } })).toBe(true);
  });

  it("ignores unrelated errors", () => {
    expect(isBadSeq(new Error("insufficient balance"))).toBe(false);
    expect(isBadSeq(null)).toBe(false);
  });
});

describe("withSeqRetry", () => {
  it("retries on bad-seq then succeeds", async () => {
    let calls = 0;
    const result = await withSeqRetry(
      async () => {
        calls++;
        if (calls < 2) throw new Error("txBadSeq");
        return "ok";
      },
      4,
      1,
    );
    expect(result).toBe("ok");
    expect(calls).toBe(2);
  });

  it("does not retry on unrelated errors", async () => {
    let calls = 0;
    await expect(
      withSeqRetry(
        async () => {
          calls++;
          throw new Error("nope");
        },
        4,
        1,
      ),
    ).rejects.toThrow("nope");
    expect(calls).toBe(1);
  });
});

describe("pollUntilChanged", () => {
  it("returns once the signature changes", async () => {
    const states = ["a", "a", "b"];
    let i = 0;
    const result = await pollUntilChanged(
      async () => states[i++] ?? null,
      (v) => v,
      "a",
      6,
      1,
    );
    expect(result).toBe("b");
  });

  it("returns the latest value when nothing changes within attempts", async () => {
    const result = await pollUntilChanged(
      async () => "a",
      (v) => v,
      "a",
      3,
      1,
    );
    expect(result).toBe("a");
  });
});
