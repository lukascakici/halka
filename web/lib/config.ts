import { Networks } from "@stellar/stellar-sdk";

/**
 * Halka runs entirely on the Stellar Testnet for Levels 1–3.
 * Mainnet is only part of the roadmap vision.
 */
export const NETWORK = {
  passphrase: Networks.TESTNET,
  label: "Testnet",
  horizonUrl: "https://horizon-testnet.stellar.org",
  friendbotUrl: "https://friendbot.stellar.org",
  explorerTx: (hash: string) =>
    `https://stellar.expert/explorer/testnet/tx/${hash}`,
  explorerAccount: (address: string) =>
    `https://stellar.expert/explorer/testnet/account/${address}`,
} as const;
