import { NETWORK } from "./config";

/**
 * Multi-wallet layer built on StellarWalletsKit (Level 2).
 * The kit and its wallet modules touch browser-only APIs (web components,
 * window), so everything is imported dynamically and only on the client.
 */

export type WalletErrorKind = "not-available" | "rejected" | "unknown";

export class WalletError extends Error {
  kind: WalletErrorKind;
  constructor(kind: WalletErrorKind, message: string) {
    super(message);
    this.name = "WalletError";
    this.kind = kind;
  }
}

function mapError(raw: unknown): WalletError {
  const msg =
    typeof raw === "object" && raw && "message" in raw
      ? String((raw as { message: unknown }).message)
      : String(raw);
  if (/declin|reject|denied|cancel|close/i.test(msg)) {
    return new WalletError("rejected", "Wallet request was cancelled.");
  }
  return new WalletError("unknown", msg || "Unknown wallet error.");
}

// Kit type is loaded lazily; keep a handle once initialized.
type Kit = typeof import("@creit.tech/stellar-wallets-kit").StellarWalletsKit;
let kitPromise: Promise<Kit> | null = null;

async function ensureKit(): Promise<Kit> {
  if (typeof window === "undefined") {
    throw new WalletError("not-available", "Wallet is only available in the browser.");
  }
  if (!kitPromise) {
    kitPromise = (async () => {
      const { StellarWalletsKit, Networks } = await import(
        "@creit.tech/stellar-wallets-kit"
      );
      const [{ FreighterModule }, { xBullModule }, { AlbedoModule }, { HanaModule }] =
        await Promise.all([
          import("@creit.tech/stellar-wallets-kit/modules/freighter"),
          import("@creit.tech/stellar-wallets-kit/modules/xbull"),
          import("@creit.tech/stellar-wallets-kit/modules/albedo"),
          import("@creit.tech/stellar-wallets-kit/modules/hana"),
        ]);
      StellarWalletsKit.init({
        network: Networks.TESTNET,
        modules: [
          new FreighterModule(),
          new xBullModule(),
          new AlbedoModule(),
          new HanaModule(),
        ],
      });
      return StellarWalletsKit;
    })();
  }
  return kitPromise;
}

/** Open the wallet-selection modal and return the connected address. */
export async function connectWallet(): Promise<string> {
  const kit = await ensureKit();
  try {
    const { address } = await kit.authModal();
    if (!address) throw new WalletError("unknown", "No address returned.");
    return address;
  } catch (e) {
    if (e instanceof WalletError) throw e;
    throw mapError(e);
  }
}

/** Restore a previously connected address without prompting, if possible. */
export async function restoreAddress(): Promise<string | null> {
  try {
    const kit = await ensureKit();
    const { address } = await kit.getAddress();
    return address || null;
  } catch {
    return null;
  }
}

/** The network passphrase the active wallet is pointed at. */
export async function getActiveNetworkPassphrase(): Promise<string | null> {
  try {
    const kit = await ensureKit();
    const { networkPassphrase } = await kit.getNetwork();
    return networkPassphrase ?? null;
  } catch {
    return null;
  }
}

export async function disconnectWallet(): Promise<void> {
  try {
    const kit = await ensureKit();
    await kit.disconnect();
  } catch {
    /* ignore — local state is cleared by the provider regardless */
  }
}

/** Sign a transaction XDR with the active wallet on Testnet. */
export async function signXdr(xdr: string, address: string): Promise<string> {
  const kit = await ensureKit();
  try {
    const { signedTxXdr } = await kit.signTransaction(xdr, {
      networkPassphrase: NETWORK.passphrase,
      address,
    });
    return signedTxXdr;
  } catch (e) {
    throw mapError(e);
  }
}
