import { describe, it, expect } from "vitest";
import { NETWORKS, isNetworkAvailable } from "./config";

describe("network configuration", () => {
  it("keeps testnet usable out of the box", () => {
    expect(isNetworkAvailable("testnet")).toBe(true);
    expect(NETWORKS.testnet.friendbotUrl).toBeTruthy();
  });

  // The guard that stops the switcher from offering a network that would fail
  // on its first call. The mainnet contracts are deployed and hardcoded, so the
  // only remaining requirement is the RPC endpoint (there is no free public one
  // and it carries an API key, so it has no default).
  it("locks mainnet until its RPC endpoint is configured", () => {
    expect(isNetworkAvailable("mainnet")).toBe(
      Boolean(process.env.NEXT_PUBLIC_MAINNET_RPC_URL),
    );
  });

  it("never offers a faucet on mainnet", () => {
    expect(NETWORKS.mainnet.friendbotUrl).toBeNull();
  });

  it("points each network at its own explorer", () => {
    expect(NETWORKS.testnet.explorerTx("abc")).toContain("/testnet/");
    expect(NETWORKS.mainnet.explorerTx("abc")).toContain("/public/");
  });
});
