export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Detect the stale-sequence error the RPC throws right after a prior tx. */
export function isBadSeq(e: unknown): boolean {
  let s = "";
  try {
    s = JSON.stringify(e);
  } catch {
    /* ignore */
  }
  s += " " + String((e as { message?: unknown })?.message ?? "") + " " + String(e);
  return /txbadseq|bad_seq|bad sequence/i.test(s);
}

/**
 * Retry an action that builds + submits a transaction when it fails with a
 * stale sequence number. Each attempt rebuilds the tx (fresh account fetch),
 * so a short wait lets the RPC catch up to the latest sequence.
 */
export async function withSeqRetry<T>(
  fn: () => Promise<T>,
  attempts = 4,
  delayMs = 2500,
): Promise<T> {
  let last: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      if (isBadSeq(e) && i < attempts - 1) {
        await sleep(delayMs);
        continue;
      }
      throw e;
    }
  }
  throw last;
}

/**
 * Re-run `fetcher` until its result's signature changes (the RPC has caught up
 * to a just-submitted write) or attempts run out. Returns the latest result.
 */
export async function pollUntilChanged<T>(
  fetcher: () => Promise<T | null>,
  signature: (v: T) => string,
  before: string,
  attempts = 6,
  delayMs = 1500,
): Promise<T | null> {
  let latest: T | null = null;
  for (let i = 0; i < attempts; i++) {
    latest = await fetcher();
    if (latest && signature(latest) !== before) return latest;
    await sleep(delayMs);
  }
  return latest;
}
