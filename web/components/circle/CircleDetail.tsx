"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  Ban,
  CheckCircle2,
  Circle as CircleDot,
  Coins,
  Gift,
  Loader2,
  LogOut,
  Play,
  Plus,
  ShieldAlert,
  Undo2,
  Users,
} from "lucide-react";
import { useWallet } from "@/components/WalletProvider";
import { NETWORK } from "@/lib/config";
import { truncateAddress } from "@/lib/format";
import {
  readCircleState,
  joinCircle,
  leaveCircle,
  startCircle,
  contribute,
  claimPayout,
  slashMember,
  cancelCircle,
  withdrawCollateral,
  isActive,
  hasEnded,
  statusOf,
  stroopsToXlm,
  ContractError,
  type CircleState,
} from "@/lib/circle";
import { fetchCircleEvents, type CircleEvent } from "@/lib/events";
import { getScores } from "@/lib/reputation";
import { WalletError } from "@/lib/wallet";
import { pollUntilChanged } from "@/lib/async";
import { CircleRing } from "./CircleRing";
import { Panel, PrimaryButton, ActionStatus, type ActionState } from "./shared";

const POLL_MS = 6000;

/** A compact signature of the parts of state an action can change. */
function circleSig(s: CircleState): string {
  const contributed = Object.values(s.contributions).filter(Boolean).length;
  return `${statusOf(s.config)}|${s.round}|${s.pot}|${s.members.length}|${s.contributedThisRound}|${contributed}|${s.myCollateral}`;
}

/**
 * The Soroban RPC sits behind several nodes at slightly different ledgers, so
 * back-to-back reads can briefly disagree (causing the UI to flicker). State is
 * monotonic within a round, so we never let a newer read regress: contribution
 * flags only go true, and we keep the more-advanced read.
 */
function mergeState(prev: CircleState | null, next: CircleState): CircleState {
  if (!prev || next.round !== prev.round) {
    return !prev || next.round > prev.round ? next : prev;
  }
  const contributions = { ...prev.contributions };
  for (const [k, v] of Object.entries(next.contributions)) {
    if (v) contributions[k] = true;
  }
  const prevC = Object.values(prev.contributions).filter(Boolean).length;
  const nextC = Object.values(next.contributions).filter(Boolean).length;
  const base = nextC >= prevC ? next : prev;
  return {
    ...base,
    contributions,
    contributedThisRound: prev.contributedThisRound || next.contributedThisRound,
  };
}

/**
 * Winding a circle down mid-round is destructive and cannot be undone: only the
 * round in flight is refunded, so members who already received their payout keep
 * it while members still waiting for their turn don't get those rounds back.
 * That asymmetry has to be stated before the click, not after.
 */
function WindDown({
  stalled,
  isAdmin,
  pending,
  onConfirm,
}: {
  stalled: boolean;
  isAdmin: boolean;
  pending: boolean;
  onConfirm: () => void;
}) {
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="mt-5 border-t border-zinc-100 pt-4 dark:border-zinc-800">
      {stalled && !isAdmin && (
        <p className="mb-3 inline-flex items-start gap-1.5 text-sm text-zinc-600 dark:text-zinc-300">
          <AlertTriangle
            className="mt-0.5 h-4 w-4 shrink-0 text-amber-500"
            strokeWidth={2}
          />
          This round has stalled past its deadline, so any member can wind the
          circle down and release everyone&apos;s collateral.
        </p>
      )}
      {!confirming ? (
        <button
          onClick={() => setConfirming(true)}
          disabled={pending}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-red-600 transition-colors hover:text-red-700 disabled:opacity-50 dark:text-red-400"
        >
          <Ban className="h-4 w-4" strokeWidth={2} /> Wind down this circle
        </button>
      ) : (
        <div className="rounded-xl bg-red-50 p-4 dark:bg-red-950/30">
          <p className="text-sm font-medium text-red-900 dark:text-red-200">
            This ends the circle for everyone and cannot be undone.
          </p>
          <p className="mt-1.5 text-sm text-red-800/80 dark:text-red-200/70">
            Only the current round is refunded. Members who already received
            their payout keep it, and members still waiting for their turn will
            not get those rounds back — so winding down mid-circle leaves some
            people ahead and others behind.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={() => {
                setConfirming(false);
                onConfirm();
              }}
              disabled={pending}
              className="inline-flex h-10 items-center gap-2 rounded-full bg-red-600 px-4 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
            >
              <Ban className="h-4 w-4" strokeWidth={2} /> Yes, wind it down
            </button>
            <button
              onClick={() => setConfirming(false)}
              className="inline-flex h-10 items-center rounded-full px-4 text-sm font-medium text-red-900 transition-colors hover:bg-red-100 dark:text-red-200 dark:hover:bg-red-950/50"
            >
              Keep the circle running
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function CircleDetail({ circleId }: { circleId: string }) {
  const { address, status, connect } = useWallet();
  const [state, setState] = useState<CircleState | null>(null);
  const [events, setEvents] = useState<CircleEvent[]>([]);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [action, setAction] = useState<ActionState>({ status: "idle" });

  const load = useCallback(async (): Promise<CircleState | null> => {
    if (!address) return null;
    try {
      const s = await readCircleState(circleId, address);
      const [ev, sc] = await Promise.all([
        fetchCircleEvents(circleId).catch(() => [] as CircleEvent[]),
        getScores(address, s.members).catch(() => ({})),
      ]);
      setState((prev) => mergeState(prev, s));
      setEvents(ev);
      setScores(sc);
      setLoadError(null);
      return s;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not load the circle.";
      setLoadError(
        /not found|account/i.test(msg)
          ? "Your account isn't funded on Testnet yet. Fund it on the Wallet page first."
          : msg,
      );
      return null;
    }
  }, [address, circleId]);

  useEffect(() => {
    if (status !== "connected") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    const id = setInterval(() => load(), POLL_MS);
    return () => clearInterval(id);
  }, [status, load]);

  const runAction = useCallback(
    async (label: string, fn: () => Promise<string>) => {
      const before = state ? circleSig(state) : "";
      setAction({ status: "pending", label });
      try {
        const hash = await fn();
        setAction({ status: "success", hash, label });
        // Keep re-reading until the RPC reflects the write (avoids stale UI).
        await pollUntilChanged(load, circleSig, before);
      } catch (e) {
        let message = "The transaction failed.";
        if (e instanceof ContractError) message = e.message;
        else if (e instanceof WalletError)
          message = e.kind === "rejected" ? "You cancelled the request." : e.message;
        else if (e instanceof Error) message = e.message;
        setAction({ status: "error", message });
      }
    },
    [load, state],
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
            className="mt-6 inline-flex h-12 items-center gap-2 rounded-full bg-zinc-950 px-6 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
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
        <p className="text-sm text-red-600 dark:text-red-400">{loadError}</p>
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
  const started = isActive(config);
  const ended = hasEnded(config);
  const cancelled = statusOf(config) === "Cancelled";
  const open = statusOf(config) === "Open";
  const memberCount = members.length;
  const contributedCount = Object.values(contributions).filter(Boolean).length;
  // The recipient is exempt, so a round needs everyone else (n - 1).
  const needed = started ? Math.max(memberCount - 1, 0) : memberCount;
  const allContributed = started && needed > 0 && contributedCount === needed;
  const isRecipient = !!recipient && recipient === address;
  const full = memberCount >= config.max_members;
  const progress = needed > 0 ? Math.min(contributedCount / needed, 1) : 0;
  const pending = action.status === "pending";

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500 hover:text-zinc-900"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={2} /> All circles
        </Link>

        {/* Overview */}
        <Panel>
          <div className="flex items-start justify-between gap-3">
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                ended
                  ? "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                  : "bg-accent-soft text-accent dark:bg-accent/15"
              }`}
            >
              {started
                ? `Active · Round ${round}`
                : open
                  ? "Open to join"
                  : cancelled
                    ? "Wound down"
                    : "Completed"}
            </span>
            <a
              href={NETWORK.explorerContract(circleId)}
              target="_blank"
              rel="noopener noreferrer"
              title={circleId}
              className="inline-flex shrink-0 items-center gap-1 font-mono text-xs text-zinc-400 transition-colors hover:text-accent"
            >
              {truncateAddress(circleId, 4, 4)}
              <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2.5} />
            </a>
          </div>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight">
            {stroopsToXlm(config.contribution_amount)} XLM / round
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            {memberCount} / {config.max_members} members ·{" "}
            {stroopsToXlm(config.collateral_amount)} XLM collateral
          </p>

          {/* The ring: members around the pot, recipient highlighted */}
          <div className="my-6">
            <CircleRing
              members={members}
              recipient={recipient}
              contributions={contributions}
              address={address}
              started={started}
              centerTop={started ? `Round ${round}` : "Pot"}
              centerMain={stroopsToXlm(pot)}
              centerSub="XLM in pot"
            />
          </div>

          {started && (
            <div className="mt-5">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Contributions this round</span>
                <span className="font-medium tabular-nums">
                  {contributedCount} / {needed}
                </span>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
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
            {open && !state.isMember && !full && (
              <PrimaryButton
                onClick={() => runAction("Join", () => joinCircle(circleId, address!))}
                pending={pending}
                text={`Join · ${stroopsToXlm(config.collateral_amount)} XLM collateral`}
                icon={Plus}
              />
            )}
            {open && state.isMember && (
              <button
                onClick={() => runAction("Leave", () => leaveCircle(circleId, address!))}
                disabled={pending}
                className="inline-flex h-11 items-center gap-2 rounded-full px-4 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 disabled:opacity-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                <LogOut className="h-4 w-4" strokeWidth={2} /> Leave · get{" "}
                {stroopsToXlm(config.collateral_amount)} XLM back
              </button>
            )}
            {open && state.isAdmin && memberCount >= 2 && (
              <PrimaryButton
                onClick={() => runAction("Start", () => startCircle(circleId, address!))}
                pending={pending}
                text="Start circle"
                icon={Play}
                variant="dark"
              />
            )}
            {started && state.isMember && !isRecipient && !state.contributedThisRound && (
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
            {started && isRecipient && !allContributed && (
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-accent">
                <Gift className="h-4 w-4" strokeWidth={2.5} /> It&apos;s your turn —
                you receive this round once everyone contributes
              </span>
            )}
            {started && state.isMember && !isRecipient && state.contributedThisRound && (
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-accent">
                <CheckCircle2 className="h-4 w-4" strokeWidth={2.5} /> You&apos;ve
                contributed this round
              </span>
            )}
            {open && state.isMember && (
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-accent">
                <CheckCircle2 className="h-4 w-4" strokeWidth={2.5} /> You&apos;re in
                — waiting for the admin to start
              </span>
            )}
            {open && !state.isMember && full && (
              <span className="text-sm text-zinc-500">This circle is full.</span>
            )}
            {ended && state.myCollateral > 0n && (
              <PrimaryButton
                onClick={() =>
                  runAction("Withdraw", () => withdrawCollateral(circleId, address!))
                }
                pending={pending}
                text={`Withdraw ${stroopsToXlm(state.myCollateral)} XLM collateral`}
                icon={Undo2}
              />
            )}
            {ended && state.isMember && state.myCollateral === 0n && (
              <span className="text-sm text-zinc-500">
                {cancelled
                  ? "This circle was wound down. You have nothing left to withdraw."
                  : "This circle is complete. You have nothing left to withdraw."}
              </span>
            )}
          </div>

          {/* Winding down early — destructive, so it sits apart and confirms. */}
          {started && (state.isAdmin || state.isStalled) && (
            <WindDown
              stalled={state.isStalled}
              isAdmin={state.isAdmin}
              pending={pending}
              onConfirm={() =>
                runAction("Wind down", () => cancelCircle(circleId, address!))
              }
            />
          )}
        </Panel>

        <ActionStatus action={action} onDismiss={() => setAction({ status: "idle" })} />
      </div>

      <div className="space-y-6">
        {/* Activity — fixed height, scrolls internally so the page never grows */}
        <Panel>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-zinc-500">Live activity</h3>
            {events.length > 0 && (
              <span className="text-xs text-zinc-400">{events.length}</span>
            )}
          </div>
          <ul className="mt-3 max-h-64 space-y-0.5 overflow-y-auto pr-1">
            {events.length === 0 && (
              <li className="text-sm text-zinc-400">No on-chain activity yet.</li>
            )}
            {events.map((e) => (
              <li key={e.id}>
                <a
                  href={NETWORK.explorerTx(e.txHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                >
                  <span className="text-sm font-medium capitalize">
                    {e.name.replace("_", " ")}
                  </span>
                  {e.member && (
                    <span className="truncate font-mono text-xs text-zinc-400">
                      {truncateAddress(e.member, 4, 4)}
                    </span>
                  )}
                  <span className="ml-auto shrink-0 text-xs text-zinc-400">
                    {new Date(e.ledgerClosedAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </a>
              </li>
            ))}
          </ul>
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
                  className="flex items-center justify-between gap-3 rounded-lg bg-zinc-50 px-3 py-2 dark:bg-zinc-800/50"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    {started &&
                      (m === recipient ? (
                        <Gift
                          className="h-4 w-4 shrink-0 text-accent"
                          strokeWidth={2.5}
                        />
                      ) : contributed ? (
                        <CheckCircle2
                          className="h-4 w-4 shrink-0 text-accent"
                          strokeWidth={2.5}
                        />
                      ) : (
                        <CircleDot
                          className="h-4 w-4 shrink-0 text-zinc-300 dark:text-zinc-600"
                          strokeWidth={2}
                        />
                      ))}
                    <span className="truncate font-mono text-sm">
                      {truncateAddress(m, 4, 4)}
                    </span>
                    {m === address && (
                      <span className="rounded-full bg-accent-soft px-1.5 py-0.5 text-xs font-medium text-accent dark:bg-accent/15">
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
                  <div className="flex items-center gap-2">
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
                        className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-950/40"
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
      </div>
    </div>
  );
}
