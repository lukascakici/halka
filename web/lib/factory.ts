import { Client as FactoryClient } from "@factory-client";
import { getNetwork, getContracts } from "./config";
import { signXdr } from "./wallet";
import { xlmToStroops } from "./units";
import { ContractError } from "./circle";
import { withSeqRetry } from "./async";

/**
 * How long a round may stall before any member can wind the circle down.
 * Stellar closes a ledger roughly every 5 seconds, so this is about 30 days —
 * long enough not to disrupt a monthly circle, short enough that funds are
 * never stranded for long.
 */
export const DEFAULT_ROUND_TIMEOUT_LEDGERS = 518_400;

function makeFactory(publicKey: string): FactoryClient {
  return new FactoryClient({
    contractId: getContracts().factory,
    networkPassphrase: getNetwork().passphrase,
    rpcUrl: getNetwork().sorobanRpcUrl,
    publicKey,
    signTransaction: async (xdr: string) => ({
      signedTxXdr: await signXdr(xdr, publicKey),
      signerAddress: publicKey,
    }),
  });
}

/** All circles the factory has created, newest first. */
export async function listCircles(publicKey: string): Promise<string[]> {
  const res = (await makeFactory(publicKey).list_circles()).result;
  return [...res].reverse();
}

/** Create a new circle through the factory. Returns the new circle's address. */
export async function createCircle(
  publicKey: string,
  contributionXlm: string,
  collateralXlm: string,
  maxMembers: number,
  roundTimeoutLedgers: number = DEFAULT_ROUND_TIMEOUT_LEDGERS,
): Promise<string> {
  return withSeqRetry(async () => {
    const tx = await makeFactory(publicKey).create_circle({
      creator: publicKey,
      contribution_amount: xlmToStroops(contributionXlm),
      collateral_amount: xlmToStroops(collateralXlm),
      max_members: maxMembers,
      round_timeout_ledgers: roundTimeoutLedgers,
    });
    if (tx.result.isErr()) {
      throw new ContractError("CreateFailed", tx.result.unwrapErr().message);
    }
    const sent = await tx.signAndSend();
    return sent.result.unwrap();
  });
}
