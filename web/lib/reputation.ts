import { Client as ReputationClient } from "@reputation-client";
import { getNetwork, getContracts } from "./config";

function makeClient(publicKey: string): ReputationClient {
  return new ReputationClient({
    contractId: getContracts().reputation,
    networkPassphrase: getNetwork().passphrase,
    rpcUrl: getNetwork().sorobanRpcUrl,
    publicKey,
  });
}

/** Fetch reputation scores for a set of members. */
export async function getScores(
  publicKey: string,
  members: string[],
): Promise<Record<string, number>> {
  if (members.length === 0) return {};
  const client = makeClient(publicKey);
  const results = await Promise.all(
    members.map((m) => client.get_score({ member: m })),
  );
  const scores: Record<string, number> = {};
  members.forEach((m, i) => (scores[m] = Number(results[i].result)));
  return scores;
}
