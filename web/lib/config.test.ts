import { describe, it, expect } from "vitest";
import { NETWORKS, isNetworkAvailable } from "./config";

describe("network configuration", () => {
  it("keeps testnet usable out of the box", () => {
    expect(isNetworkAvailable("testnet")).toBe(true);
    expect(NETWORKS.testnet.friendbotUrl).toBeTruthy();
  });

  // The guard that stops the switcher from offering a network that would fail
  // on its first call. Mainnet needs a paid RPC endpoint and deployed
  // contracts, neither of which has a default.
  it("locks mainnet until an RPC endpoint and contracts are configured", () => {
    const configured = Boolean(
      process.env.NEXT_PUBLIC_MAINNET_RPC_URL &&
        process.env.NEXT_PUBLIC_MAINNET_FACTORY &&
        process.env.NEXT_PUBLIC_MAINNET_REPUTATION,
    );
    expect(isNetworkAvailable("mainnet")).toBe(configured);
  });

  it("never offers a faucet on mainnet", () => {
    expect(NETWORKS.mainnet.friendbotUrl).toBeNull();
  });

  it("points each network at its own explorer", () => {
    expect(NETWORKS.testnet.explorerTx("abc")).toContain("/testnet/");
    expect(NETWORKS.mainnet.explorerTx("abc")).toContain("/public/");
  });
});
