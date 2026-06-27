import { Client as CircleClient, type CircleConfig } from "@circle-client";
import { NETWORK } from "./config";
import { signXdr } from "./wallet";

export { xlmToStroops, stroopsToXlm } from "./units";

/** A contract-level error surfaced to the UI with a friendly message. */
export class ContractError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "ContractError";
    this.code = code;
  }
}

const FRIENDLY: Record<string, string> = {
  AlreadyInitialized: "This circle has already been created.",
  NotInitialized: "This circle hasn't been created yet.",
  InvalidParams: "Invalid circle parameters.",
  CircleFull: "This circle is already full.",
  AlreadyMember: "You have already joined this circle.",
  NotMember: "You are not a member of this circle.",
  NotStarted: "The circle hasn't started yet.",
  AlreadyStarted: "The circle has already started.",
  AlreadyContributed: "You have already contributed this round.",
  RoundIncomplete: "Not everyone has contributed this round yet.",
  NotRecipient: "Only this round's recipient can claim the pot.",
  NotDefaulted: "This member has already contributed.",
};

function toContractError(code: string): ContractError {
  return new ContractError(code, FRIENDLY[code] ?? code);
}

function makeClient(circleId: string, publicKey: string): CircleClient {
  return new CircleClient({
    contractId: circleId,
    networkPassphrase: NETWORK.passphrase,
    rpcUrl: NETWORK.sorobanRpcUrl,
    publicKey,
    signTransaction: async (xdr: string) => ({
      signedTxXdr: await signXdr(xdr, publicKey),
      signerAddress: publicKey,
    }),
  });
}

export interface CircleState {
  id: string;
  config: CircleConfig;
  members: string[];
  round: number;
  pot: bigint;
  /** Current-round recipient (rotates each round), if started. */
  recipient: string | null;
  /** Per-member contribution status for the current round. */
  contributions: Record<string, boolean>;
  isMember: boolean;
  isAdmin: boolean;
  contributedThisRound: boolean;
}

/** Read the full state of one circle for the connected user. */
export async function readCircleState(
  circleId: string,
  publicKey: string,
): Promise<CircleState> {
  const client = makeClient(circleId, publicKey);

  const configTx = await client.get_config();
  if (configTx.result.isErr()) {
    throw toContractError(configTx.result.unwrapErr().message);
  }
  const config = configTx.result.unwrap();

  const [membersTx, roundTx, potTx] = await Promise.all([
    client.get_members(),
    client.get_round(),
    client.get_pot(),
  ]);
  const members = membersTx.result;
  const round = roundTx.result;
  const pot = potTx.result;

  const contributions: Record<string, boolean> = {};
  let recipient: string | null = null;
  if (round > 0 && members.length > 0) {
    const flags = await Promise.all(
      members.map((m) => client.has_contributed({ round, member: m })),
    );
    members.forEach((m, i) => (contributions[m] = flags[i].result));
    const recTx = await client.get_recipient({ round });
    recipient = recTx.result.isOk() ? recTx.result.unwrap() : null;
  }

  return {
    id: circleId,
    config,
    members,
    round,
    pot,
    recipient,
    contributions,
    isMember: members.includes(publicKey),
    isAdmin: config.admin === publicKey,
    contributedThisRound: contributions[publicKey] ?? false,
  };
}

export interface CircleSummary {
  id: string;
  config: CircleConfig;
  memberCount: number;
  round: number;
}

/** A lightweight read for circle cards in the list. */
export async function readCircleSummary(
  circleId: string,
  publicKey: string,
): Promise<CircleSummary> {
  const client = makeClient(circleId, publicKey);
  const cfgTx = await client.get_config();
  if (cfgTx.result.isErr()) {
    throw toContractError(cfgTx.result.unwrapErr().message);
  }
  const config = cfgTx.result.unwrap();
  const [membersTx, roundTx] = await Promise.all([
    client.get_members(),
    client.get_round(),
  ]);
  return {
    id: circleId,
    config,
    memberCount: membersTx.result.length,
    round: roundTx.result,
  };
}

/** Sign + send a tx, surfacing contract errors. Returns the tx hash. */
async function submit(tx: {
  result: { isErr?: () => boolean; unwrapErr?: () => { message: string } };
  signAndSend: () => Promise<{ sendTransactionResponse?: { hash?: string } }>;
}): Promise<string> {
  const sim = tx.result;
  if (sim && typeof sim.isErr === "function" && sim.isErr()) {
    throw toContractError(sim.unwrapErr!().message);
  }
  const sent = await tx.signAndSend();
  return sent.sendTransactionResponse?.hash ?? "";
}

export async function joinCircle(circleId: string, publicKey: string) {
  return submit(await makeClient(circleId, publicKey).join({ member: publicKey }));
}

export async function startCircle(circleId: string, publicKey: string) {
  return submit(await makeClient(circleId, publicKey).start());
}

export async function contribute(circleId: string, publicKey: string) {
  return submit(
    await makeClient(circleId, publicKey).contribute({ member: publicKey }),
  );
}

export async function claimPayout(circleId: string, publicKey: string) {
  return submit(await makeClient(circleId, publicKey).claim_payout());
}

export async function slashMember(
  circleId: string,
  publicKey: string,
  member: string,
) {
  return submit(await makeClient(circleId, publicKey).slash({ member }));
}
