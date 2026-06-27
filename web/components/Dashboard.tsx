"use client";

import { useState } from "react";
import { AlertTriangle, Loader2, Wallet } from "lucide-react";
import { useWallet } from "./WalletProvider";
import { BalanceCard } from "./BalanceCard";
import { SendForm } from "./SendForm";
import { NETWORK } from "@/lib/config";

export function Dashboard() {
  const { status, isWrongNetwork, error, connect } = useWallet();
  const [refreshNonce, setRefreshNonce] = useState(0);
  const connected = status === "connected";

  return (
    <>
      <div className="max-w-2xl">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Save together. <span className="text-accent">On-chain.</span>
        </h1>
        <p className="mt-4 text-lg leading-8 text-zinc-600">
          Halka turns the trusted savings circle into a transparent protocol on
          Stellar. Manage your wallet here, then head to the Circle to join and
          contribute on {NETWORK.label}.
        </p>
      </div>

      {isWrongNetwork && (
        <div className="mt-8 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2.5} />
          <span>
            Your wallet is on a different network. Switch to{" "}
            <strong>{NETWORK.label}</strong> to use Halka.
          </span>
        </div>
      )}

      {connected ? (
        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <BalanceCard refreshNonce={refreshNonce} />
          <SendForm onSuccess={() => setRefreshNonce((n) => n + 1)} />
        </div>
      ) : (
        <div className="mt-10 rounded-2xl border border-zinc-200 p-10 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft">
            <Wallet className="h-6 w-6 text-accent" strokeWidth={2} />
          </div>
          <h2 className="mt-4 text-xl font-semibold tracking-tight">
            Connect your wallet to begin
          </h2>
          <p className="mx-auto mt-2 max-w-md text-zinc-600">
            Halka works with any Stellar wallet on the {NETWORK.label}. Connect
            to view your balance and send a contribution.
          </p>
          <button
            type="button"
            onClick={() => connect().catch(() => {})}
            disabled={status === "connecting"}
            className="mt-6 inline-flex h-12 items-center gap-2 rounded-full bg-zinc-950 px-6 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-60"
          >
            {status === "connecting" && (
              <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.5} />
            )}
            {status === "connecting" ? "Connecting" : "Connect wallet"}
          </button>
          {error && (
            <p className="mt-4 text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
        </div>
      )}
    </>
  );
}
