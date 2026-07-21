import { rpc, scValToNative } from "@stellar/stellar-sdk";
import { getNetwork } from "./config";

// Built on first use rather than at import time, so the RPC endpoint always
// reflects the network the page actually loaded with.
let cached: rpc.Server | null = null;
function server(): rpc.Server {
  cached ??= new rpc.Server(getNetwork().sorobanRpcUrl);
  return cached;
}

export interface CircleEvent {
  id: string;
  name: string; // joined | started | contributed | paid_out | slashed
  ledgerClosedAt: string;
  txHash: string;
  member?: string;
  data: unknown;
}

/**
 * Fetch recent contract events for a circle, newest first.
 * Used to drive the live activity feed and state synchronization.
 */
export async function fetchCircleEvents(
  circleId: string,
  limit = 25,
): Promise<CircleEvent[]> {
  const latest = await server().getLatestLedger();
  const startLedger = Math.max(1, latest.sequence - 9000);

  const res = await server().getEvents({
    startLedger,
    filters: [{ type: "contract", contractIds: [circleId] }],
    limit,
  });

  return res.events
    .map((e) => {
      const topics = e.topic.map((t) => scValToNative(t));
      const name = String(topics[0] ?? "event");
      const member =
        topics.length > 1 && typeof topics[1] === "string"
          ? topics[1]
          : undefined;
      return {
        id: e.id,
        name,
        ledgerClosedAt: e.ledgerClosedAt,
        txHash: e.txHash,
        member,
        data: scValToNative(e.value),
      };
    })
    .reverse();
}
