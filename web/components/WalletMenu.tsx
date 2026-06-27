"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Power } from "lucide-react";
import { useWallet } from "./WalletProvider";
import { truncateAddress } from "@/lib/format";
import { NETWORK } from "@/lib/config";
import { BalanceCard } from "./BalanceCard";
import { SendForm } from "./SendForm";

/** The wallet lives behind the address chip: click it to open balance + send. */
export function WalletMenu() {
  const { address, disconnect } = useWallet();
  const [open, setOpen] = useState(false);
  const [nonce, setNonce] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  if (!address) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex h-9 items-center gap-1.5 rounded-full border border-zinc-200 bg-white/50 px-3 font-mono text-sm text-zinc-700 transition-colors hover:bg-white"
      >
        {truncateAddress(address)}
        <ChevronDown
          className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
          strokeWidth={2}
        />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[min(92vw,380px)] space-y-3 rounded-2xl border border-zinc-200 bg-white p-3 shadow-xl">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-medium text-zinc-500">
              {NETWORK.label}
            </span>
            <button
              type="button"
              onClick={() => {
                disconnect();
                setOpen(false);
              }}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-900"
            >
              <Power className="h-4 w-4" strokeWidth={2} />
              Disconnect
            </button>
          </div>
          <BalanceCard refreshNonce={nonce} />
          <SendForm onSuccess={() => setNonce((n) => n + 1)} />
        </div>
      )}
    </div>
  );
}
