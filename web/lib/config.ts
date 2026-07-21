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
  factory: "CCQAHHQJ2SHRZH34CZ5S3REQECIPAOKA3ALCUK6Y3V5WOQM2I67RR53Y",
  /** Shared cross-circle reputation contract. */
  reputation: "CCZT5YSIKH2CXMOKNZUI7VPPN7ZZRBE2C37E7NLUFCFQOWAPG6YLD2WF",
  /** Native XLM wrapped as a Stellar Asset Contract (the contribution token). */
  token: "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC",
} as const;
