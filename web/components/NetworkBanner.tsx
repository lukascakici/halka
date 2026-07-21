"use client";

import { AlertTriangle } from "lucide-react";
import { useWallet } from "./WalletProvider";
import { useNetwork } from "@/lib/useNetwork";

export function NetworkBanner() {
  const network = useNetwork();
  const { isWrongNetwork } = useWallet();
  if (!isWrongNetwork) return null;

  return (
    <div className="border-b border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/30">
      <div className="mx-auto flex w-full max-w-5xl items-center gap-2.5 px-5 py-2.5 text-sm text-amber-800 dark:text-amber-300">
        <AlertTriangle className="h-4 w-4 shrink-0" strokeWidth={2.5} />
        <span>
          Your wallet is on a different network. Switch it to{" "}
          <strong className="font-semibold">{network.label}</strong> to use
          Halka.
        </span>
      </div>
    </div>
  );
}
