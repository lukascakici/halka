import { Networks } from "@stellar/stellar-sdk";

export type NetworkId = "testnet" | "mainnet";

export interface NetworkConfig {
  id: NetworkId;
  passphrase: string;
  label: string;
  horizonUrl: string;
  sorobanRpcUrl: string;
  /** Testnet only — mainnet accounts are funded with real XLM. */
  friendbotUrl: string | null;
  explorerTx: (hash: string) => string;
  explorerAccount: (address: string) => string;
  explorerContract: (id: string) => string;
}

export interface ContractAddresses {
  /** Factory that deploys and registers Circle instances. */
  factory: string;
  /** Shared cross-circle reputation contract. */
  reputation: string;
  /** Native XLM wrapped as a Stellar Asset Contract (the contribution token). */
  token: string;
}

const explorers = (net: string) => ({
  explorerTx: (hash: string) =>
    `https://stellar.expert/explorer/${net}/tx/${hash}`,
  explorerAccount: (address: string) =>
    `https://stellar.expert/explorer/${net}/account/${address}`,
  explorerContract: (id: string) =>
    `https://stellar.expert/explorer/${net}/contract/${id}`,
});

const TESTNET: NetworkConfig = {
  id: "testnet",
  passphrase: Networks.TESTNET,
  label: "Testnet",
  horizonUrl: "https://horizon-testnet.stellar.org",
  sorobanRpcUrl: "https://soroban-testnet.stellar.org",
  friendbotUrl: "https://friendbot.stellar.org",
  ...explorers("testnet"),
};

/**
 * There is no free public Soroban RPC for mainnet — it comes from a provider
 * (Blockdaemon, QuickNode, Validation Cloud, …), so the URL has to be supplied.
 */
const MAINNET: NetworkConfig = {
  id: "mainnet",
  passphrase: Networks.PUBLIC,
  label: "Mainnet",
  horizonUrl: "https://horizon.stellar.org",
  sorobanRpcUrl: process.env.NEXT_PUBLIC_MAINNET_RPC_URL ?? "",
  friendbotUrl: null,
  ...explorers("public"),
};

export const NETWORKS: Record<NetworkId, NetworkConfig> = {
  testnet: TESTNET,
  mainnet: MAINNET,
};

const CONTRACTS_BY_NETWORK: Record<NetworkId, ContractAddresses> = {
  testnet: {
    factory: "CCQAHHQJ2SHRZH34CZ5S3REQECIPAOKA3ALCUK6Y3V5WOQM2I67RR53Y",
    reputation: "CCZT5YSIKH2CXMOKNZUI7VPPN7ZZRBE2C37E7NLUFCFQOWAPG6YLD2WF",
    token: "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC",
  },
  mainnet: {
    // Deployed addresses are public (unlike the RPC URL), so they live here as
    // defaults; the env vars stay as an override for a fresh deployment.
    factory:
      process.env.NEXT_PUBLIC_MAINNET_FACTORY ??
      "CDKRCTCUHNJJIZW5I4VFI6SG57DMIHHFXIGPW5KDKIJEUMSSAMMLC7RJ",
    reputation:
      process.env.NEXT_PUBLIC_MAINNET_REPUTATION ??
      "CDACN7M44Z2NU4T7CLW5VBJHCQNDMVSJPZNAHGVJ3BUPOVIB4PSOOUE2",
    // Derived with `stellar contract id asset --asset native --network mainnet`.
    token: "CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA",
  },
};

/**
 * A network is usable only once it has somewhere to read from and contracts to
 * read. Mainnet stays unavailable until both are configured, so the UI can
 * offer it as "coming soon" instead of failing on the first call.
 */
export function isNetworkAvailable(id: NetworkId): boolean {
  const contracts = CONTRACTS_BY_NETWORK[id];
  return Boolean(
    NETWORKS[id].sorobanRpcUrl && contracts.factory && contracts.reputation,
  );
}

export const STORAGE_KEY = "halka.network";
const DEFAULT_NETWORK: NetworkId = "testnet";

/**
 * The active network is read once per page load, not per call: switching it
 * reloads the page, which is what keeps the wallet, the RPC clients and the
 * cached circle state from ever disagreeing about which chain they are on.
 */
let active: NetworkId | null = null;

export function getNetworkId(): NetworkId {
  if (active) return active;
  if (typeof window !== "undefined") {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "mainnet" || stored === "testnet") {
      // Never strand the app on a network it can't reach.
      active = isNetworkAvailable(stored) ? stored : DEFAULT_NETWORK;
      return active;
    }
  }
  return DEFAULT_NETWORK;
}

/** Switch networks and reload, so nothing keeps stale chain state. */
export function switchNetwork(id: NetworkId): void {
  if (typeof window === "undefined" || !isNetworkAvailable(id)) return;
  window.localStorage.setItem(STORAGE_KEY, id);
  window.location.reload();
}

export function getNetwork(): NetworkConfig {
  return NETWORKS[getNetworkId()];
}

export function getContracts(): ContractAddresses {
  return CONTRACTS_BY_NETWORK[getNetworkId()];
}
