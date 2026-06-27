import {
  Horizon,
  TransactionBuilder,
  Operation,
  Asset,
  BASE_FEE,
  StrKey,
  Memo,
} from "@stellar/stellar-sdk";
import { NETWORK } from "./config";

const server = new Horizon.Server(NETWORK.horizonUrl);

/** Validate a Stellar public key (G...). */
export function isValidAddress(address: string): boolean {
  try {
    return StrKey.isValidEd25519PublicKey(address.trim());
  } catch {
    return false;
  }
}

/**
 * Fetch the native XLM balance.
 * Returns null when the account is not yet funded on Testnet.
 */
export async function getXlmBalance(address: string): Promise<string | null> {
  try {
    const account = await server.loadAccount(address);
    const native = account.balances.find((b) => b.asset_type === "native");
    return native ? native.balance : "0";
  } catch (e: unknown) {
    if (isNotFound(e)) return null;
    throw e;
  }
}

/** Fund an account on Testnet via Friendbot. */
export async function fundWithFriendbot(address: string): Promise<void> {
  const res = await fetch(
    `${NETWORK.friendbotUrl}?addr=${encodeURIComponent(address)}`,
  );
  if (!res.ok) {
    throw new Error("Friendbot could not fund this account. Try again.");
  }
}

export interface SendPaymentParams {
  source: string;
  destination: string;
  amount: string;
  memo?: string;
  /** Signs an XDR and returns the signed XDR (provided by the wallet layer). */
  sign: (xdr: string) => Promise<string>;
}

/** Minimum starting balance (XLM) required to create a brand-new account. */
const MIN_ACCOUNT_BALANCE = 1;

/** Returns true if the destination account already exists on the network. */
async function accountExists(address: string): Promise<boolean> {
  try {
    await server.loadAccount(address);
    return true;
  } catch (e: unknown) {
    if (isNotFound(e)) return false;
    throw e;
  }
}

/**
 * Build, sign, and submit a native XLM transfer on Testnet.
 * - Existing destination  -> a normal payment.
 * - New destination       -> createAccount, so sending to a fresh address works.
 * Returns the transaction hash on success.
 */
export async function sendPayment({
  source,
  destination,
  amount,
  memo,
  sign,
}: SendPaymentParams): Promise<string> {
  const account = await server.loadAccount(source);
  const destExists = await accountExists(destination);

  if (!destExists && Number(amount) < MIN_ACCOUNT_BALANCE) {
    throw new Error(
      `This address has no account yet. Send at least ${MIN_ACCOUNT_BALANCE} XLM to create it.`,
    );
  }

  const operation = destExists
    ? Operation.payment({
        destination,
        asset: Asset.native(),
        amount,
      })
    : Operation.createAccount({
        destination,
        startingBalance: amount,
      });

  const builder = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK.passphrase,
  })
    .addOperation(operation)
    .setTimeout(180);

  if (memo && memo.trim()) {
    builder.addMemo(Memo.text(memo.trim().slice(0, 28)));
  }

  const tx = builder.build();
  const signedXdr = await sign(tx.toXDR());
  const signedTx = TransactionBuilder.fromXDR(signedXdr, NETWORK.passphrase);

  try {
    const result = await server.submitTransaction(signedTx);
    return result.hash;
  } catch (e: unknown) {
    throw new Error(parseHorizonError(e));
  }
}

/* ----------------------------- helpers ----------------------------- */

function isNotFound(e: unknown): boolean {
  return (
    typeof e === "object" &&
    e !== null &&
    "response" in e &&
    (e as { response?: { status?: number } }).response?.status === 404
  );
}

/** Turn a Horizon submit error into a human-readable message. */
function parseHorizonError(e: unknown): string {
  const extras =
    typeof e === "object" && e !== null && "response" in e
      ? (e as { response?: { data?: { extras?: Record<string, unknown> } } })
          .response?.data?.extras
      : undefined;

  const codes = extras?.result_codes as
    | { transaction?: string; operations?: string[] }
    | undefined;

  const opCode = codes?.operations?.[0];
  const txCode = codes?.transaction;

  if (opCode === "op_underfunded" || txCode === "tx_insufficient_balance") {
    return "Insufficient XLM balance for this payment.";
  }
  if (opCode === "op_no_destination") {
    return "Destination account does not exist on Testnet yet.";
  }
  if (txCode === "tx_bad_seq") {
    return "Transaction sequence was out of date. Please try again.";
  }
  if (typeof e === "object" && e !== null && "message" in e) {
    return String((e as { message: unknown }).message);
  }
  return "The transaction failed to submit.";
}
