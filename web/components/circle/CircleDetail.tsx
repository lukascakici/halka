"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  CheckCircle2,
  Circle as CircleDot,
  Coins,
  Gift,
  Loader2,
  Play,
  Plus,
  ShieldAlert,
  Users,
} from "lucide-react";
import { useWallet } from "@/components/WalletProvider";
import { CopyButton } from "@/components/CopyButton";
import { NETWORK } from "@/lib/config";
import { truncateAddress } from "@/lib/format";
import {
  readCircleState,
  joinCircle,
  startCircle,
  contribute,
  claimPayout,
  slashMember,
  stroopsToXlm,
  ContractError,
  type CircleState,
} from "@/lib/circle";
import { fetchCircleEvents, type CircleEvent } from "@/lib/events";
import { getScores } from "@/lib/reputation";
import { WalletError } from "@/lib/wallet";
import { Panel, PrimaryButton, ActionStatus, type ActionState } from "./shared";

const POLL_MS = 6000;

export function CircleDetail({ circleId }: { circleId: string }) {
  const { address, status, connect } = useWallet();
  const [state, setState] = useState<CircleState | null>(null);
  const [events, setEvents] = useState<CircleEvent[]>([]);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [action, setAction] = useState<ActionState>({ status: "idle" });

  const load = useCallback(
    async () => {
      if (!address) return;
      try {
        const s = await readCircleState(circleId, address);
        const [ev, sc] = await Promise.all([
          fetchCircleEvents(circleId).catch(() => [] as CircleEvent[]),
          getScores(address, s.members).catch(() => ({})),
        ]);
        setState(s);
        setEvents(ev);
        setScores(sc);
        setLoadError(null);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Could not load the circle.";
        setLoadError(
          /not found|account/i.test(msg)
            ? "Your account isn't funded on Testnet yet. Fund it on the Wallet page first."
            : msg,
        );
      }
    },
    [address, circleId],
  );

  useEffect(() => {
    if (status !== "connected") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    const id = setInterval(() => load(), POLL_MS);
    return () => clearInterval(id);
  }, [status, load]);

  const runAction = useCallback(
    async (label: string, fn: () => Promise<string>) => {
      setAction({ status: "pending", label });
      try {
        const hash = await fn();
        setAction({ status: "success", hash, label });
        await load();
      } catch (e) {
        let message = "The transaction failed.";
        if (e instanceof ContractError) message = e.message;
        else if (e instanceof WalletError)
          message = e.kind === "rejected" ? "You cancelled the request." : e.message;
        else if (e instanceof Error) message = e.message;
        setAction({ status: "error", message });
      }
    },
    [load],
  );

  if (status !== "connected") {
    return (
      <Panel>
        <div className="py-6 text-center">
          <h2 className="text-xl font-semibold tracking-tight">
            Connect your wallet
          </h2>
          <p className="mx-auto mt-2 max-w-md text-zinc-600">
            Connect to view this circle and take part on {NETWORK.label}.
          </p>
          <button
            onClick={() => connect().catch(() => {})}
            className="mt-6 inline-flex h-12 items-center gap-2 rounded-full bg-zinc-950 px-6 text-sm font-medium text-white transition-colors hover:bg-zinc-800"
          >
            Connect wallet
          </button>
        </div>
      </Panel>
    );
  }

  if (loadError) {
    return (
      <Panel>
        <p className="text-sm text-red-600">{loadError}</p>
        <button
          onClick={() => load()}
          className="mt-3 text-sm font-medium text-accent hover:text-accent-hover"
        >
          Try again
        </button>
      </Panel>
    );
  }

  if (!state) {
    return (
      <Panel>
        <div className="flex h-24 items-center justify-center text-zinc-400">
          <Loader2 className="h-5 w-5 animate-spin" strokeWidth={2.5} />
        </div>
      </Panel>
    );
  }

  const { config, members, round, pot, recipient, contributions } = state;
  const started = config.started;
  const memberCount = members.length;
  const contributedCount = Object.values(contributions).filter(Boolean).length;
  const allContributed = memberCount > 0 && contributedCount === memberCount;
  const isRecipient = !!recipient && recipient === address;
  const full = memberCount >= config.max_members;
  const progress = memberCount > 0 ? Math.min(contributedCount / memberCount, 1) : 0;
  const pending = action.status === "pending";

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <Link
          href="/circles"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500 hover:text-zinc-900"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={2} /> All circles
        </Link>

        {/* Overview */}
        <Panel>
          <div className="flex items-start justify-between">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                {started ? `Active · Round ${round}` : "Open to join"}
              </span>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight">
                {stroopsToXlm(config.contribution_amount)} XLM / round
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                {memberCount} / {config.max_members} members ·{" "}
                {stroopsToXlm(config.collateral_amount)} XLM collateral
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs font-medium text-zinc-500">Pot</p>
              <p className="text-2xl font-semibold tabular-nums">
                {stroopsToXlm(pot)}
                <span className="ml-1 text-sm font-medium text-zinc-400">XLM</span>
              </p>
            </div>
          </div>

          {started && (
            <div className="mt-5">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Contributions this round</span>
                <span className="font-medium tabular-nums">
                  {contributedCount} / {memberCount}
                </span>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-zinc-100">
                <div
                  className="h-full rounded-full bg-accent transition-all duration-500"
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
              {recipient && (
                <p className="mt-3 inline-flex items-center gap-1.5 text-sm text-zinc-600">
                  <Gift className="h-4 w-4 text-accent" strokeWidth={2} />
                  This round pays{" "}
                  <span className="font-medium">
                    {recipient === address ? "you" : truncateAddress(recipient)}
                  </span>
                </p>
              )}
            </div>
          )}
        </Panel>

        {/* Actions */}
        <Panel>
          <div className="flex flex-wrap items-center gap-3">
            {!started && !state.isMember && !full && (
              <PrimaryButton
                onClick={() => runAction("Join", () => joinCircle(circleId, address!))}
                pending={pending}
                text={`Join · ${stroopsToXlm(config.collateral_amount)} XLM collateral`}
                icon={Plus}
              />
            )}
            {!started && state.isAdmin && memberCount >= 2 && (
              <PrimaryButton
                onClick={() => runAction("Start", () => startCircle(circleId, address!))}
                pending={pending}
                text="Start circle"
                icon={Play}
                variant="dark"
              />
            )}
            {started && state.isMember && !state.contributedThisRound && (
              <PrimaryButton
                onClick={() => runAction("Contribute", () => contribute(circleId, address!))}
                pending={pending}
                text={`Contribute ${stroopsToXlm(config.contribution_amount)} XLM`}
                icon={Coins}
              />
            )}
            {started && isRecipient && allContributed && (
              <PrimaryButton
                onClick={() => runAction("Claim payout", () => claimPayout(circleId, address!))}
                pending={pending}
                text={`Claim ${stroopsToXlm(pot)} XLM`}
                icon={Gift}
              />
            )}
            {started && state.isMember && state.contributedThisRound && !isRecipient && (
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-accent">
                <CheckCircle2 className="h-4 w-4" strokeWidth={2.5} /> You&apos;ve
                contributed this round
              </span>
            )}
            {!started && state.isMember && (
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-accent">
                <CheckCircle2 className="h-4 w-4" strokeWidth={2.5} /> You&apos;re in
                — waiting for the admin to start
              </span>
            )}
            {!started && !state.isMember && full && (
              <span className="text-sm text-zinc-500">This circle is full.</span>
            )}
          </div>
        </Panel>

        {/* Members */}
        <Panel>
          <p className="flex items-center gap-1.5 text-sm font-medium text-zinc-500">
            <Users className="h-4 w-4" strokeWidth={2} /> Members
          </p>
          <ul className="mt-3 space-y-2">
            {members.map((m) => {
              const contributed = contributions[m];
              const canSlash =
                started && state.isAdmin && !contributed && m !== recipient;
              return (
                <li
                  key={m}
                  className="flex items-center justify-between gap-3 rounded-lg bg-zinc-50 px-3 py-2"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    {started &&
                      (contributed ? (
                        <CheckCircle2
                          className="h-4 w-4 shrink-0 text-accent"
                          strokeWidth={2.5}
                        />
                      ) : (
                        <CircleDot
                          className="h-4 w-4 shrink-0 text-zinc-300"
                          strokeWidth={2}
                        />
                      ))}
                    <span className="truncate font-mono text-sm">
                      {truncateAddress(m, 6, 6)}
                    </span>
                    {m === address && (
                      <span className="rounded-full bg-accent-soft px-1.5 py-0.5 text-xs font-medium text-accent">
                        you
                      </span>
                    )}
                    {m === config.admin && (
                      <span className="text-xs font-medium text-zinc-400">admin</span>
                    )}
                    {m === recipient && (
                      <span className="text-xs font-medium text-accent">recipient</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className="text-xs font-medium text-zinc-500"
                      title="Reputation score"
                    >
                      ★ {scores[m] ?? 0}
                    </span>
                    {canSlash && (
                      <button
                        onClick={() =>
                          runAction("Slash", () => slashMember(circleId, address!, m))
                        }
                        disabled={pending}
                        className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
                      >
                        <ShieldAlert className="h-3.5 w-3.5" strokeWidth={2} /> Slash
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </Panel>

        <ActionStatus action={action} onDismiss={() => setAction({ status: "idle" })} />
      </div>

      <div className="space-y-6">
        {/* Activity */}
        <Panel>
          <h3 className="text-sm font-medium text-zinc-500">Live activity</h3>
          <ul className="mt-4 space-y-3">
            {events.length === 0 && (
              <li className="text-sm text-zinc-400">No on-chain activity yet.</li>
            )}
            {events.map((e) => (
              <li key={e.id} className="flex items-start gap-3">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                <div className="min-w-0">
                  <p className="text-sm font-medium capitalize">
                    {e.name.replace("_", " ")}
                  </p>
                  {e.member && (
                    <p className="font-mono text-xs text-zinc-500">
                      {truncateAddress(e.member, 6, 6)}
                    </p>
                  )}
                  <a
                    href={NETWORK.explorerTx(e.txHash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-zinc-400 hover:text-accent"
                  >
                    {new Date(e.ledgerClosedAt).toLocaleTimeString()}
                  </a>
                </div>
              </li>
            ))}
          </ul>
        </Panel>

        {/* Contract */}
        <Panel>
          <h3 className="text-sm font-medium text-zinc-500">Contract</h3>
          <div className="mt-3 flex items-center justify-between">
            <span className="font-mono text-xs text-zinc-600">
              {truncateAddress(circleId, 6, 6)}
            </span>
            <div className="flex items-center gap-3">
              <CopyButton value={circleId} label="Copy" />
              <a
                href={NETWORK.explorerContract(circleId)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:text-accent-hover"
              >
                Explorer <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2.5} />
              </a>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
