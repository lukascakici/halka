import { Client, type CircleConfig } from "@circle-client";
import { NETWORK, CONTRACTS } from "./config";
import { signXdr } from "./wallet";

/** Native XLM (and its SAC) use 7 decimals. */
const DECIMALS = 7n;
const ONE_XLM = 10n ** DECIMALS;

export function xlmToStroops(amount: string | number): bigint {
  const [whole, frac = ""] = String(amount).split(".");
  const fracPadded = (frac + "0".repeat(7)).slice(0, 7);
  return BigInt(whole || "0") * ONE_XLM + BigInt(fracPadded || "0");
}

export function stroopsToXlm(stroops: bigint): string {
  const neg = stroops < 0n;
  const abs = neg ? -stroops : stroops;
  const whole = abs / ONE_XLM;
  const frac = (abs % ONE_XLM).toString().padStart(7, "0").replace(/0+$/, "");
  return `${neg ? "-" : ""}${whole}${frac ? "." + frac : ""}`;
}

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
};

function toContractError(code: string): ContractError {
  return new ContractError(code, FRIENDLY[code] ?? code);
}

function makeClient(publicKey: string): Client {
  return new Client({
    contractId: CONTRACTS.circle,
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
  initialized: boolean;
  config?: CircleConfig;
  members: string[];
  round: number;
  pot: bigint;
  /** Whether the connected member has contributed in the current round. */
  contributedThisRound: boolean;
  isMember: boolean;
  isAdmin: boolean;
}

/** Read the full circle state for the connected user. */
export async function readCircleState(publicKey: string): Promise<CircleState> {
  const client = makeClient(publicKey);

  const configTx = await client.get_config();
  if (configTx.result.isErr()) {
    return {
      initialized: false,
      members: [],
      round: 0,
      pot: 0n,
      contributedThisRound: false,
      isMember: false,
      isAdmin: false,
    };
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

  let contributedThisRound = false;
  if (round > 0) {
    const c = await client.has_contributed({ round, member: publicKey });
    contributedThisRound = c.result;
  }

  return {
    initialized: true,
    config,
    members,
    round,
    pot,
    contributedThisRound,
    isMember: members.includes(publicKey),
    isAdmin: config.admin === publicKey,
  };
}

/** Sign + send an assembled tx, surfacing contract errors. Returns the tx hash. */
async function submit(
  tx: { result: unknown; signAndSend: () => Promise<{ sendTransactionResponse?: { hash?: string } }> },
): Promise<string> {
  const sim = tx.result as { isErr?: () => boolean; unwrapErr?: () => { message: string } };
  if (sim && typeof sim.isErr === "function" && sim.isErr()) {
    throw toContractError(sim.unwrapErr!().message);
  }
  const sent = await tx.signAndSend();
  return sent.sendTransactionResponse?.hash ?? "";
}

export async function initializeCircle(
  publicKey: string,
  contributionXlm: string,
  maxMembers: number,
): Promise<string> {
  const client = makeClient(publicKey);
  const tx = await client.initialize({
    admin: publicKey,
    token: CONTRACTS.token,
    contribution_amount: xlmToStroops(contributionXlm),
    max_members: maxMembers,
  });
  return submit(tx);
}

export async function joinCircle(publicKey: string): Promise<string> {
  const client = makeClient(publicKey);
  return submit(await client.join({ member: publicKey }));
}

export async function startCircle(publicKey: string): Promise<string> {
  const client = makeClient(publicKey);
  return submit(await client.start());
}

export async function contribute(publicKey: string): Promise<string> {
  const client = makeClient(publicKey);
  return submit(await client.contribute({ member: publicKey }));
}
