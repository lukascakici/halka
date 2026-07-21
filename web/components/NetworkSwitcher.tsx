"use client";

import { Lock } from "lucide-react";
import {
  NETWORKS,
  isNetworkAvailable,
  switchNetwork,
  type NetworkId,
} from "@/lib/config";
import { useNetwork } from "@/lib/useNetwork";

const ORDER: NetworkId[] = ["testnet", "mainnet"];

/**
 * Which chain the whole app talks to. This can't be per-circle: the RPC
 * endpoint, the network passphrase, the deployed contract addresses and the
 * wallet's own network all have to agree, so switching reloads the page.
 *
 * Mainnet stays locked until it has both an RPC endpoint and deployed
 * contracts — offering a network that fails on the first call is worse than
 * not offering it.
 */
export function NetworkSwitcher() {
  const current = useNetwork().id;

  return (
    <div
      className="flex items-center gap-0.5 rounded-full bg-zinc-100 p-0.5 dark:bg-zinc-800"
      role="group"
      aria-label="Network"
    >
      {ORDER.map((id) => {
        const available = isNetworkAvailable(id);
        const selected = current === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => available && !selected && switchNetwork(id)}
            disabled={!available}
            aria-pressed={selected}
            title={
              available
                ? `Use ${NETWORKS[id].label}`
                : `${NETWORKS[id].label} isn't live yet — it needs a Soroban RPC endpoint and deployed contracts.`
            }
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
              selected
                ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-100"
                : available
                  ? "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
                  : "cursor-not-allowed text-zinc-400 dark:text-zinc-600"
            }`}
          >
            {!available && <Lock className="h-3 w-3" strokeWidth={2.5} />}
            {NETWORKS[id].label}
          </button>
        );
      })}
    </div>
  );
}
