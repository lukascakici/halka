"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Loader2, Power } from "lucide-react";
import { useWallet } from "./WalletProvider";
import { truncateAddress } from "@/lib/format";
import { NETWORK } from "@/lib/config";

const NAV = [
  { href: "/", label: "Wallet" },
  { href: "/circles", label: "Circles" },
];

export function Header() {
  const { status, address, connect, disconnect } = useWallet();
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-5">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5">
            <span
              aria-hidden
              className="h-6 w-6 rounded-full border-[3px] border-accent"
            />
            <span className="text-lg font-semibold tracking-tight">Halka</span>
            <span className="ml-1 inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-600">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              {NETWORK.label}
            </span>
          </Link>
          <nav className="hidden items-center gap-1 sm:flex">
            {NAV.map((item) => {
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith("/circle");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                    active
                      ? "bg-zinc-100 text-zinc-900"
                      : "text-zinc-500 hover:text-zinc-900"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {status === "connected" && address ? (
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-zinc-200 px-3 py-1.5 font-mono text-sm text-zinc-700">
              {truncateAddress(address)}
            </span>
            <button
              type="button"
              onClick={disconnect}
              className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
              aria-label="Disconnect wallet"
            >
              <Power className="h-4 w-4" strokeWidth={2} />
              <span className="hidden sm:inline">Disconnect</span>
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => connect().catch(() => {})}
            disabled={status === "connecting"}
            className="inline-flex h-10 items-center gap-2 rounded-full bg-zinc-950 px-5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-60"
          >
            {status === "connecting" && (
              <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.5} />
            )}
            {status === "connecting" ? "Connecting" : "Connect wallet"}
          </button>
        )}
      </div>
    </header>
  );
}
