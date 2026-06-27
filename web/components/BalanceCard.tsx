"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { useWallet } from "./WalletProvider";
import { getXlmBalance, fundWithFriendbot } from "@/lib/stellar";
import { formatXlm } from "@/lib/format";
import { CopyButton } from "./CopyButton";
import { NETWORK } from "@/lib/config";

export function BalanceCard({ refreshNonce }: { refreshNonce: number }) {
  const { address } = useWallet();
  const [balance, setBalance] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [funding, setFunding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!address) return;
    setLoading(true);
    setError(null);
    try {
      const b = await getXlmBalance(address);
      setBalance(b);
    } catch {
      setError("Could not load balance. Check your connection.");
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    // Fetch balance on mount and whenever a transaction succeeds.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load, refreshNonce]);

  const onFund = useCallback(async () => {
    if (!address) return;
    setFunding(true);
    setError(null);
    try {
      await fundWithFriendbot(address);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Funding failed.");
    } finally {
      setFunding(false);
    }
  }, [address, load]);

  const unfunded = balance === null && !loading && !error;

  return (
    <section className="rounded-2xl border border-zinc-200 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-zinc-500">Wallet balance</h2>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-900 disabled:opacity-50"
          aria-label="Refresh balance"
        >
          <RefreshCw
            className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
            strokeWidth={2}
          />
          Refresh
        </button>
      </div>

      <div className="mt-4">
        {loading ? (
          <div className="flex h-12 items-center text-zinc-400">
            <Loader2 className="h-5 w-5 animate-spin" strokeWidth={2.5} />
          </div>
        ) : unfunded ? (
          <div>
            <p className="text-2xl font-semibold tracking-tight text-zinc-900">
              Account not funded
            </p>
            <p className="mt-1 text-sm text-zinc-500">
              This account doesn’t exist on {NETWORK.label} yet. Fund it to get
              started.
            </p>
            <button
              type="button"
              onClick={onFund}
              disabled={funding}
              className="mt-4 inline-flex h-10 items-center gap-2 rounded-full bg-accent px-5 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-60"
            >
              {funding && (
                <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.5} />
              )}
              {funding ? "Funding" : "Fund with Friendbot"}
            </button>
          </div>
        ) : (
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-semibold tracking-tight tabular-nums">
              {formatXlm(balance ?? "0")}
            </span>
            <span className="text-lg font-medium text-zinc-400">XLM</span>
          </div>
        )}
      </div>

      {address && (
        <div className="mt-5 flex items-center justify-between border-t border-zinc-100 pt-4">
          <span className="font-mono text-xs text-zinc-400 break-all">
            {address}
          </span>
          <CopyButton value={address} label="Copy" />
        </div>
      )}

      {error && (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
