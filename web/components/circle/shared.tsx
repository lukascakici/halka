"use client";

import type { ReactNode } from "react";
import { ArrowUpRight, CheckCircle2, Loader2, XCircle } from "lucide-react";
import { CopyButton } from "@/components/CopyButton";
import { useNetwork } from "@/lib/useNetwork";

export type ActionState =
  | { status: "idle" }
  | { status: "pending"; label: string }
  | { status: "success"; hash: string; label: string }
  | { status: "error"; message: string };

export function Panel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900 ${className}`}
    >
      {children}
    </section>
  );
}

export function PrimaryButton({
  onClick,
  pending,
  text,
  icon: Icon,
  variant = "accent",
  disabled = false,
}: {
  onClick: () => void;
  pending: boolean;
  text: string;
  icon?: typeof CheckCircle2;
  variant?: "accent" | "dark" | "danger";
  disabled?: boolean;
}) {
  const colors =
    variant === "dark"
      ? "bg-zinc-950 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
      : variant === "danger"
        ? "bg-red-600 hover:bg-red-700"
        : "bg-accent hover:bg-accent-hover";
  return (
    <button
      onClick={onClick}
      disabled={pending || disabled}
      className={`inline-flex h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${colors}`}
    >
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.5} />
      ) : (
        Icon && <Icon className="h-4 w-4" strokeWidth={2.5} />
      )}
      {text}
    </button>
  );
}

export function ActionStatus({
  action,
  onDismiss,
}: {
  action: ActionState;
  onDismiss: () => void;
}) {
  // Before the early returns — hooks can't run conditionally.
  const network = useNetwork();
  if (action.status === "idle") return null;
  if (action.status === "pending") {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white p-4 text-sm dark:border-zinc-800 dark:bg-zinc-900">
        <Loader2 className="h-4 w-4 animate-spin text-accent" strokeWidth={2.5} />
        {action.label} — confirm in your wallet…
      </div>
    );
  }
  if (action.status === "error") {
    return (
      <div className="flex items-start gap-2 rounded-xl bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
        <XCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2.5} />
        <span className="flex-1">{action.message}</span>
        <button onClick={onDismiss} className="font-medium hover:underline">
          Dismiss
        </button>
      </div>
    );
  }
  return (
    <div className="rounded-xl bg-accent-soft p-4 text-sm dark:bg-accent/15">
      <div className="flex items-center gap-2 font-medium text-accent">
        <CheckCircle2 className="h-4 w-4" strokeWidth={2.5} /> {action.label} confirmed
      </div>
      <div className="mt-2 flex items-center gap-4">
        <CopyButton value={action.hash} label="Copy hash" />
        <a
          href={network.explorerTx(action.hash)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 font-medium text-accent hover:text-accent-hover"
        >
          View on Explorer <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2.5} />
        </a>
        <button
          onClick={onDismiss}
          className="ml-auto text-zinc-500 hover:text-zinc-900"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
