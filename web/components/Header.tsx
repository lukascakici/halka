"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";
import { useWallet } from "./WalletProvider";
import { WalletMenu } from "./WalletMenu";
import { ThemeToggle } from "./ThemeToggle";

export function Header() {
  const { status, connect } = useWallet();

  return (
    <header className="sticky top-0 z-20 px-3 pt-3 sm:px-5 sm:pt-4">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-3 rounded-2xl border border-zinc-200/70 bg-white/60 px-4 shadow-lg shadow-zinc-900/5 backdrop-blur-xl backdrop-saturate-150 dark:border-zinc-800/70 dark:bg-zinc-900/60 sm:px-5">
        <Link href="/" className="flex items-center gap-2.5">
          <span
            aria-hidden
            className="h-6 w-6 rounded-full border-[3px] border-accent"
          />
          <span className="text-lg font-semibold tracking-tight">Halka</span>
        </Link>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <ThemeToggle />
          {status === "connected" ? (
            <WalletMenu />
          ) : (
            <button
              type="button"
              onClick={() => connect().catch(() => {})}
              disabled={status === "connecting"}
              className="inline-flex h-10 items-center gap-2 rounded-full bg-zinc-950 px-4 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 sm:px-5"
            >
            {status === "connecting" && (
              <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.5} />
            )}
            <span className="sm:hidden">
              {status === "connecting" ? "…" : "Connect"}
            </span>
            <span className="hidden sm:inline">
              {status === "connecting" ? "Connecting" : "Connect wallet"}
            </span>
          </button>
          )}
        </div>
      </div>
    </header>
  );
}
