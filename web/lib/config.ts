import { Networks } from "@stellar/stellar-sdk";

/**
 * Halka runs entirely on the Stellar Testnet for Levels 1–3.
 * Mainnet is only part of the roadmap vision.
 */
export const NETWORK = {
  passphrase: Networks.TESTNET,
  label: "Testnet",
  horizonUrl: "https://horizon-testnet.stellar.org",
  sorobanRpcUrl: "https://soroban-testnet.stellar.org",
  friendbotUrl: "https://friendbot.stellar.org",
  explorerTx: (hash: string) =>
    `https://stellar.expert/explorer/testnet/tx/${hash}`,
  explorerAccount: (address: string) =>
    `https://stellar.expert/explorer/testnet/account/${address}`,
  explorerContract: (id: string) =>
    `https://stellar.expert/explorer/testnet/contract/${id}`,
} as const;

/** Deployed contract addresses (see docs/deployments.md). */
export const CONTRACTS = {
  /** Factory that deploys and registers Circle instances. */
  factory: "CCJHQ2WNT6BBT2VDQAE7WLK5ME3JLP6AK6FIOGQNQATSAJCKZFH5554P",
  /** Shared cross-circle reputation contract. */
  reputation: "CD65FDOB75TYWGEDCJKAJW7TQWTRANXI5O43LMOQCMS5ZZN5RNDRWF3L",
  /** Native XLM wrapped as a Stellar Asset Contract (the contribution token). */
  token: "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC",
} as const;
