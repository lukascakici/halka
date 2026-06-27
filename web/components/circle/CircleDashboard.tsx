"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ArrowUpRight,
  CheckCircle2,
  Loader2,
  Play,
  Plus,
  Users,
  Wallet,
  XCircle,
} from "lucide-react";
import { useWallet } from "@/components/WalletProvider";
import { CopyButton } from "@/components/CopyButton";
import { NETWORK, CONTRACTS } from "@/lib/config";
import { truncateAddress } from "@/lib/format";
import {
  readCircleState,
  initializeCircle,
  joinCircle,
  startCircle,
  contribute,
  stroopsToXlm,
  ContractError,
  type CircleState,
} from "@/lib/circle";
import { fetchCircleEvents, type CircleEvent } from "@/lib/events";
import { WalletError } from "@/lib/wallet";

type ActionState =
  | { status: "idle" }
  | { status: "pending"; label: string }
  | { status: "success"; hash: string; label: string }
  | { status: "error"; message: string };

const POLL_MS = 6000;

export function CircleDashboard() {
  const { address, status } = useWallet();
  const [state, setState] = useState<CircleState | null>(null);
  const [events, setEvents] = useState<CircleEvent[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [action, setAction] = useState<ActionState>({ status: "idle" });

  // create form
  const [contributionXlm, setContributionXlm] = useState("2");
  const [maxMembers, setMaxMembers] = useState("5");

  const load = useCallback(
    async (showSpinner = false) => {
      if (!address) return;
      if (showSpinner) setLoading(true);
      try {
        const [s, ev] = await Promise.all([
          readCircleState(address),
          fetchCircleEvents().catch(() => [] as CircleEvent[]),
        ]);
        setState(s);
        setEvents(ev);
        setLoadError(null);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Could not load the circle.";
        setLoadError(
          /not found|notfound|account/i.test(msg)
            ? "Your account isn't funded on Testnet yet. Fund it on the Wallet page first."
            : msg,
        );
      } finally {
        if (showSpinner) setLoading(false);
      }
    },
    [address],
  );

  useEffect(() => {
    if (status !== "connected") return;
    // Load on connect, then poll for live state + event synchronization.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load(true);
    const id = setInterval(() => load(false), POLL_MS);
    return () => clearInterval(id);
  }, [status, load]);

  const runAction = useCallback(
    async (label: string, fn: () => Promise<string>) => {
      setAction({ status: "pending", label });
      try {
        const hash = await fn();
        setAction({ status: "success", hash, label });
        await load(false);
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
    return <ConnectPrompt />;
  }

  const config = state?.config;
  const contributionStroops = config?.contribution_amount ?? 0n;
  const contributedCount =
    config && contributionStroops > 0n
      ? Number(state!.pot / contributionStroops)
      : 0;
  const memberCount = state?.members.length ?? 0;

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-6">
        {loadError ? (
          <Panel>
            <p className="text-sm text-red-600">{loadError}</p>
            <button
              onClick={() => load(true)}
              className="mt-3 text-sm font-medium text-accent hover:text-accent-hover"
            >
              Try again
            </button>
          </Panel>
        ) : loading && !state ? (
          <Panel>
            <div className="flex h-24 items-center justify-center text-zinc-400">
              <Loader2 className="h-5 w-5 animate-spin" strokeWidth={2.5} />
            </div>
          </Panel>
        ) : state && !state.initialized ? (
          <CreateCircle
            contributionXlm={contributionXlm}
            setContributionXlm={setContributionXlm}
            maxMembers={maxMembers}
            setMaxMembers={setMaxMembers}
            disabled={action.status === "pending"}
            onCreate={() =>
              runAction("Create circle", () =>
                initializeCircle(address!, contributionXlm, Number(maxMembers)),
              )
            }
          />
        ) : state && config ? (
          <>
            <CircleOverview
              state={state}
              address={address}
              contributedCount={contributedCount}
              memberCount={memberCount}
            />
            <CircleActions
              state={state}
              memberCount={memberCount}
              pending={action.status === "pending"}
              pendingLabel={action.status === "pending" ? action.label : ""}
              onJoin={() => runAction("Join circle", () => joinCircle(address!))}
              onStart={() => runAction("Start circle", () => startCircle(address!))}
              onContribute={() =>
                runAction("Contribute", () => contribute(address!))
              }
            />
          </>
        ) : null}

        <ActionStatus action={action} onDismiss={() => setAction({ status: "idle" })} />
      </div>

      <div className="space-y-6">
        <ActivityFeed events={events} />
        <ContractInfo />
      </div>
    </div>
  );
}

/* ----------------------------- sections ----------------------------- */

function CircleOverview({
  state,
  address,
  contributedCount,
  memberCount,
}: {
  state: CircleState;
  address: string | null;
  contributedCount: number;
  memberCount: number;
}) {
  const config = state.config!;
  const started = config.started;
  const progress = memberCount > 0 ? Math.min(contributedCount / memberCount, 1) : 0;

  return (
    <Panel>
      <div className="flex items-start justify-between">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            {started ? `Active · Round ${state.round}` : "Open to join"}
          </span>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight">
            {stroopsToXlm(config.contribution_amount)} XLM / round
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            {memberCount} / {config.max_members} members
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs font-medium text-zinc-500">Pot</p>
          <p className="text-2xl font-semibold tabular-nums">
            {stroopsToXlm(state.pot)}
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
        </div>
      )}

      <div className="mt-6 border-t border-zinc-100 pt-4">
        <p className="flex items-center gap-1.5 text-sm font-medium text-zinc-500">
          <Users className="h-4 w-4" strokeWidth={2} /> Members
        </p>
        <ul className="mt-3 space-y-2">
          {state.members.map((m) => (
            <li
              key={m}
              className="flex items-center justify-between rounded-lg bg-zinc-50 px-3 py-2"
            >
              <span className="font-mono text-sm">{truncateAddress(m, 6, 6)}</span>
              <span className="flex items-center gap-2">
                {m === config.admin && (
                  <span className="text-xs font-medium text-zinc-400">admin</span>
                )}
                {m === address && (
                  <span className="text-xs font-medium text-accent">you</span>
                )}
              </span>
            </li>
          ))}
          {memberCount === 0 && (
            <li className="text-sm text-zinc-400">No members yet.</li>
          )}
        </ul>
      </div>
    </Panel>
  );
}

function CircleActions({
  state,
  memberCount,
  pending,
  pendingLabel,
  onJoin,
  onStart,
  onContribute,
}: {
  state: CircleState;
  memberCount: number;
  pending: boolean;
  pendingLabel: string;
  onJoin: () => void;
  onStart: () => void;
  onContribute: () => void;
}) {
  const config = state.config!;
  const full = memberCount >= config.max_members;

  if (!config.started) {
    return (
      <Panel>
        <div className="flex flex-wrap items-center gap-3">
          {!state.isMember && !full && (
            <PrimaryButton onClick={onJoin} pending={pending} label={pendingLabel} text="Join circle" icon={Plus} />
          )}
          {state.isMember && (
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-accent">
              <CheckCircle2 className="h-4 w-4" strokeWidth={2.5} /> You&apos;re in this circle
            </span>
          )}
          {state.isAdmin && memberCount >= 1 && (
            <PrimaryButton onClick={onStart} pending={pending} label={pendingLabel} text="Start circle" icon={Play} variant="dark" />
          )}
          {full && !state.isMember && (
            <span className="text-sm text-zinc-500">This circle is full.</span>
          )}
        </div>
        {!state.isMember && !full && (
          <p className="mt-3 text-sm text-zinc-500">
            Joining adds you to the circle. Once the admin starts it, each round
            you contribute the fixed amount.
          </p>
        )}
      </Panel>
    );
  }

  // started
  return (
    <Panel>
      {!state.isMember ? (
        <p className="text-sm text-zinc-500">
          This circle has started and is locked to its current members.
        </p>
      ) : state.contributedThisRound ? (
        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-accent">
          <CheckCircle2 className="h-4 w-4" strokeWidth={2.5} /> You&apos;ve
          contributed this round
        </span>
      ) : (
        <PrimaryButton
          onClick={onContribute}
          pending={pending}
          label={pendingLabel}
          text={`Contribute ${stroopsToXlm(config.contribution_amount)} XLM`}
          icon={ArrowUpRight}
        />
      )}
    </Panel>
  );
}

function CreateCircle({
  contributionXlm,
  setContributionXlm,
  maxMembers,
  setMaxMembers,
  disabled,
  onCreate,
}: {
  contributionXlm: string;
  setContributionXlm: (v: string) => void;
  maxMembers: string;
  setMaxMembers: (v: string) => void;
  disabled: boolean;
  onCreate: () => void;
}) {
  const valid =
    Number(contributionXlm) > 0 && Number(maxMembers) >= 2 && Number(maxMembers) <= 50;

  return (
    <Panel>
      <h2 className="text-lg font-semibold tracking-tight">Create the circle</h2>
      <p className="mt-1 text-sm text-zinc-500">
        This circle hasn&apos;t been created yet. Set the terms and you&apos;ll
        become its admin.
      </p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Field label="Contribution per round (XLM)">
          <input
            type="number"
            min="0"
            step="0.1"
            value={contributionXlm}
            onChange={(e) => setContributionXlm(e.target.value)}
            className="input"
          />
        </Field>
        <Field label="Max members">
          <input
            type="number"
            min="2"
            max="50"
            value={maxMembers}
            onChange={(e) => setMaxMembers(e.target.value)}
            className="input"
          />
        </Field>
      </div>
      <button
        onClick={onCreate}
        disabled={!valid || disabled}
        className="mt-5 inline-flex h-12 items-center justify-center gap-2 rounded-full bg-accent px-6 text-sm font-semibold text-white transition-colors hover:bg-accent-hover disabled:bg-zinc-200 disabled:text-zinc-400"
      >
        {disabled && <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.5} />}
        Create circle
      </button>
    </Panel>
  );
}

function ActivityFeed({ events }: { events: CircleEvent[] }) {
  return (
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
              <p className="text-sm font-medium capitalize">{e.name}</p>
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
  );
}

function ContractInfo() {
  return (
    <Panel>
      <h3 className="text-sm font-medium text-zinc-500">Contract</h3>
      <div className="mt-3 flex items-center justify-between">
        <span className="font-mono text-xs text-zinc-600">
          {truncateAddress(CONTRACTS.circle, 6, 6)}
        </span>
        <div className="flex items-center gap-3">
          <CopyButton value={CONTRACTS.circle} label="Copy" />
          <a
            href={NETWORK.explorerContract(CONTRACTS.circle)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:text-accent-hover"
          >
            Explorer <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2.5} />
          </a>
        </div>
      </div>
    </Panel>
  );
}

function ActionStatus({
  action,
  onDismiss,
}: {
  action: ActionState;
  onDismiss: () => void;
}) {
  if (action.status === "idle") return null;
  if (action.status === "pending") {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white p-4 text-sm">
        <Loader2 className="h-4 w-4 animate-spin text-accent" strokeWidth={2.5} />
        {action.label} — confirm in your wallet…
      </div>
    );
  }
  if (action.status === "error") {
    return (
      <div className="flex items-start gap-2 rounded-xl bg-red-50 p-4 text-sm text-red-700">
        <XCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2.5} />
        <span className="flex-1">{action.message}</span>
        <button onClick={onDismiss} className="font-medium hover:underline">
          Dismiss
        </button>
      </div>
    );
  }
  return (
    <div className="rounded-xl bg-accent-soft p-4 text-sm">
      <div className="flex items-center gap-2 font-medium text-accent">
        <CheckCircle2 className="h-4 w-4" strokeWidth={2.5} /> {action.label} confirmed
      </div>
      <div className="mt-2 flex items-center gap-4">
        <CopyButton value={action.hash} label="Copy hash" />
        <a
          href={NETWORK.explorerTx(action.hash)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 font-medium text-accent hover:text-accent-hover"
        >
          View on Explorer <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2.5} />
        </a>
        <button onClick={onDismiss} className="ml-auto text-zinc-500 hover:text-zinc-900">
          Dismiss
        </button>
      </div>
    </div>
  );
}

function ConnectPrompt() {
  const { connect, status, error } = useWallet();
  return (
    <Panel>
      <div className="py-6 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft">
          <Wallet className="h-6 w-6 text-accent" strokeWidth={2} />
        </div>
        <h2 className="mt-4 text-xl font-semibold tracking-tight">
          Connect your wallet
        </h2>
        <p className="mx-auto mt-2 max-w-md text-zinc-600">
          Connect any Stellar wallet to view the circle, join, and contribute on{" "}
          {NETWORK.label}.
        </p>
        <button
          onClick={() => connect().catch(() => {})}
          disabled={status === "connecting"}
          className="mt-6 inline-flex h-12 items-center gap-2 rounded-full bg-zinc-950 px-6 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-60"
        >
          {status === "connecting" && (
            <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.5} />
          )}
          {status === "connecting" ? "Connecting" : "Connect wallet"}
        </button>
        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      </div>
    </Panel>
  );
}

/* ----------------------------- primitives ----------------------------- */

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-zinc-200 p-6">{children}</section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-zinc-700">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

function PrimaryButton({
  onClick,
  pending,
  label,
  text,
  icon: Icon,
  variant = "accent",
}: {
  onClick: () => void;
  pending: boolean;
  label: string;
  text: string;
  icon: typeof Plus;
  variant?: "accent" | "dark";
}) {
  return (
    <button
      onClick={onClick}
      disabled={pending}
      className={`inline-flex h-11 items-center gap-2 rounded-full px-5 text-sm font-semibold text-white transition-colors disabled:opacity-60 ${
        variant === "dark"
          ? "bg-zinc-950 hover:bg-zinc-800"
          : "bg-accent hover:bg-accent-hover"
      }`}
    >
      {pending && label === text ? (
        <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.5} />
      ) : (
        <Icon className="h-4 w-4" strokeWidth={2.5} />
      )}
      {text}
    </button>
  );
}
