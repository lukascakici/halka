import {
  isConnected,
  requestAccess,
  getAddress,
  getNetwork,
  signTransaction,
} from "@stellar/freighter-api";
import { NETWORK } from "./config";

/**
 * Typed wallet errors so the UI can show precise feedback
 * (Level 1 requirement: clear success/failure states).
 */
export type WalletErrorKind =
  | "not-installed"
  | "rejected"
  | "wrong-network"
  | "unknown";

export class WalletError extends Error {
  kind: WalletErrorKind;
  constructor(kind: WalletErrorKind, message: string) {
    super(message);
    this.name = "WalletError";
    this.kind = kind;
  }
}

function mapFreighterError(raw: unknown): WalletError {
  const msg =
    (typeof raw === "object" && raw && "message" in raw
      ? String((raw as { message: unknown }).message)
      : String(raw)) || "Unknown wallet error";
  if (/declin|reject|denied|cancel/i.test(msg)) {
    return new WalletError("rejected", "You rejected the request in Freighter.");
  }
  return new WalletError("unknown", msg);
}

/** True if the Freighter extension is available in this browser. */
export async function isFreighterInstalled(): Promise<boolean> {
  try {
    const res = await isConnected();
    return Boolean(res.isConnected);
  } catch {
    return false;
  }
}

/** Prompt the user to connect Freighter; returns the active address. */
export async function connectWallet(): Promise<string> {
  if (!(await isFreighterInstalled())) {
    throw new WalletError(
      "not-installed",
      "Freighter wallet was not found. Install it to continue.",
    );
  }
  const res = await requestAccess();
  if (res.error) throw mapFreighterError(res.error);
  if (!res.address) throw new WalletError("unknown", "No address returned.");
  return res.address;
}

/** Silently restore the address if access was already granted (no prompt). */
export async function restoreAddress(): Promise<string | null> {
  try {
    if (!(await isFreighterInstalled())) return null;
    const res = await getAddress();
    if (res.error || !res.address) return null;
    return res.address;
  } catch {
    return null;
  }
}

/** Read the network Freighter is currently pointed at. */
export async function getActiveNetworkPassphrase(): Promise<string | null> {
  try {
    const res = await getNetwork();
    if (res.error) return null;
    return res.networkPassphrase ?? null;
  } catch {
    return null;
  }
}

/** Sign a transaction XDR with Freighter on Testnet. */
export async function signXdr(xdr: string, address: string): Promise<string> {
  const res = await signTransaction(xdr, {
    networkPassphrase: NETWORK.passphrase,
    address,
  });
  if (res.error) throw mapFreighterError(res.error);
  return res.signedTxXdr;
}
