"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Loader2, Plus, Users, Wallet } from "lucide-react";
import { useWallet } from "@/components/WalletProvider";
import { NETWORK } from "@/lib/config";
import {
  listCircles,
  createCircle as createCircleTx,
} from "@/lib/factory";
import {
  readCircleSummary,
  stroopsToXlm,
  ContractError,
  hasEnded,
  statusOf,
  type CircleSummary,
} from "@/lib/circle";
import { WalletError } from "@/lib/wallet";
import { pollUntilChanged } from "@/lib/async";
import { Panel, PrimaryButton, ActionStatus, type ActionState } from "@/components/circle/shared";

export function CirclesList() {
  const { address, status, connect } = useWallet();
  const [circles, setCircles] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [action, setAction] = useState<ActionState>({ status: "idle" });

  const [contribution, setContribution] = useState("2");
  const [collateral, setCollateral] = useState("2");
  const [maxMembers, setMaxMembers] = useState("5");

  const load = useCallback(async (): Promise<string[] | null> => {
    if (!address) return null;
    setLoading(true);
    try {
      const c = await listCircles(address);
      setCircles(c);
      setError(null);
      return c;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not load circles.";
      setError(
        /not found|account/i.test(msg)
          ? "Your account isn't funded on Testnet yet. Fund it on the Wallet page first."
          : msg,
      );
      return null;
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    if (status !== "connected") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [status, load]);

  const valid =
    Number(contribution) > 0 &&
    Number(collateral) >= Number(contribution) &&
    Number(maxMembers) >= 2 &&
    Number(maxMembers) <= 50;

  const onCreate = useCallback(async () => {
    if (!address || !valid) return;
    setAction({ status: "pending", label: "Create circle" });
    try {
      const before = circles ? circles.join(",") : "";
      const hash = await createCircleTx(address, contribution, collateral, Number(maxMembers));
      setAction({ status: "success", hash, label: "Create circle" });
      // Keep re-reading until the new circle shows up (RPC catch-up).
      await pollUntilChanged(load, (c) => c.join(","), before);
    } catch (e) {
      let message = "Could not create the circle.";
      if (e instanceof ContractError) message = e.message;
      else if (e instanceof WalletError)
        message = e.kind === "rejected" ? "You cancelled the request." : e.message;
      else if (e instanceof Error) message = e.message;
      setAction({ status: "error", message });
    }
  }, [address, valid, contribution, collateral, maxMembers, load, circles]);

  if (status !== "connected") {
    return (
      <Panel>
        <div className="py-6 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft dark:bg-accent/15">
            <Wallet className="h-6 w-6 text-accent" strokeWidth={2} />
          </div>
          <h2 className="mt-4 text-xl font-semibold tracking-tight">
            Connect your wallet
          </h2>
          <p className="mx-auto mt-2 max-w-md text-zinc-600 dark:text-zinc-400">
            Connect to browse circles and start your own on {NETWORK.label}.
          </p>
          <button
            onClick={() => connect().catch(() => {})}
            className="mt-6 inline-flex h-12 items-center gap-2 rounded-full bg-zinc-950 px-6 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Connect wallet
          </button>
        </div>
      </Panel>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Create */}
      <div className="lg:col-span-1">
        <Panel>
          <h2 className="text-lg font-semibold tracking-tight">Start a circle</h2>
          <p className="mt-1 text-sm text-zinc-500">
            You&apos;ll be the admin. Collateral must be at least the
            contribution.
          </p>
          <div className="mt-4 space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Contribution / round (XLM)
              </span>
              <input
                type="number"
                min="0"
                step="0.1"
                value={contribution}
                onChange={(e) => setContribution(e.target.value)}
                className="input mt-1.5"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Collateral (XLM)
              </span>
              <input
                type="number"
                min="0"
                step="0.1"
                value={collateral}
                onChange={(e) => setCollateral(e.target.value)}
                className="input mt-1.5"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Max members</span>
              <input
                type="number"
                min="2"
                max="50"
                value={maxMembers}
                onChange={(e) => setMaxMembers(e.target.value)}
                className="input mt-1.5"
              />
            </label>
            <PrimaryButton
              onClick={onCreate}
              pending={action.status === "pending"}
              text="Create circle"
              icon={Plus}
              disabled={!valid}
            />
            {Number(collateral) < Number(contribution) && (
              <p className="text-sm text-red-600 dark:text-red-400">
                Collateral must be at least the contribution.
              </p>
            )}
          </div>
        </Panel>
        <div className="mt-6">
          <ActionStatus action={action} onDismiss={() => setAction({ status: "idle" })} />
        </div>
      </div>

      {/* List */}
      <div className="space-y-4 lg:col-span-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight">Circles</h2>
          {loading && (
            <Loader2 className="h-4 w-4 animate-spin text-zinc-400" strokeWidth={2.5} />
          )}
        </div>
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        {circles && circles.length === 0 && !loading && (
          <Panel>
            <p className="text-sm text-zinc-500">
              No circles yet. Create the first one.
            </p>
          </Panel>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          {circles?.map((id) => (
            <CircleCard key={id} id={id} address={address!} />
          ))}
        </div>
      </div>
    </div>
  );
}

function CircleCard({ id, address }: { id: string; address: string }) {
  const [summary, setSummary] = useState<CircleSummary | null>(null);

  useEffect(() => {
    let alive = true;
    readCircleSummary(id, address)
      .then((s) => alive && setSummary(s))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [id, address]);

  return (
    <Link
      href={`/circle/${id}`}
      className="group block rounded-2xl border border-zinc-200 bg-white p-5 transition-colors hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700 dark:hover:bg-zinc-800/50"
    >
      {summary ? (
        <>
          <div className="flex items-center justify-between">
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                hasEnded(summary.config)
                  ? "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                  : "bg-accent-soft text-accent dark:bg-accent/15"
              }`}
            >
              {statusOf(summary.config) === "Active"
                ? `Round ${summary.round}`
                : statusOf(summary.config) === "Open"
                  ? "Open"
                  : statusOf(summary.config) === "Cancelled"
                    ? "Wound down"
                    : "Completed"}
            </span>
            <ArrowUpRight
              className="h-4 w-4 text-zinc-300 transition-colors group-hover:text-zinc-900 dark:text-zinc-600 dark:group-hover:text-zinc-100"
              strokeWidth={2.5}
            />
          </div>
          <p className="mt-3 text-xl font-semibold tracking-tight">
            {stroopsToXlm(summary.config.contribution_amount)} XLM
            <span className="text-sm font-medium text-zinc-400"> / round</span>
          </p>
          <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-zinc-500">
            <Users className="h-4 w-4" strokeWidth={2} />
            {summary.memberCount} / {summary.config.max_members} members
          </p>
        </>
      ) : (
        <div className="flex h-20 items-center justify-center text-zinc-300">
          <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.5} />
        </div>
      )}
    </Link>
  );
}
