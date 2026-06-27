import { Client as FactoryClient } from "@factory-client";
import { NETWORK, CONTRACTS } from "./config";
import { signXdr } from "./wallet";
import { xlmToStroops } from "./units";
import { ContractError } from "./circle";

function makeFactory(publicKey: string): FactoryClient {
  return new FactoryClient({
    contractId: CONTRACTS.factory,
    networkPassphrase: NETWORK.passphrase,
    rpcUrl: NETWORK.sorobanRpcUrl,
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
): Promise<string> {
  const tx = await makeFactory(publicKey).create_circle({
    creator: publicKey,
    contribution_amount: xlmToStroops(contributionXlm),
    collateral_amount: xlmToStroops(collateralXlm),
    max_members: maxMembers,
  });
  if (tx.result.isErr()) {
    throw new ContractError("CreateFailed", tx.result.unwrapErr().message);
  }
  const sent = await tx.signAndSend();
  return sent.result.unwrap();
}
