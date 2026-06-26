"use client";

import { useState, type FormEvent } from "react";
import { ArrowUpRight, CheckCircle2, Loader2, XCircle } from "lucide-react";
import { useWallet } from "./WalletProvider";
import { sendPayment, isValidAddress } from "@/lib/stellar";
import { NETWORK } from "@/lib/config";
import { CopyButton } from "./CopyButton";
import { truncateAddress } from "@/lib/format";

type TxState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "success"; hash: string }
  | { status: "error"; message: string };

export function SendForm({ onSuccess }: { onSuccess: () => void }) {
  const { address, signXdr } = useWallet();
  const [destination, setDestination] = useState("");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [tx, setTx] = useState<TxState>({ status: "idle" });

  const trimmedDest = destination.trim();
  const amountNum = Number(amount);
  const destValid = trimmedDest.length > 0 && isValidAddress(trimmedDest);
  const amountValid = amount.length > 0 && Number.isFinite(amountNum) && amountNum > 0;
  const selfSend = destValid && address === trimmedDest;
  const canSubmit =
    destValid && amountValid && !selfSend && tx.status !== "submitting";

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!address || !canSubmit) return;
    setTx({ status: "submitting" });
    try {
      const hash = await sendPayment({
        source: address,
        destination: trimmedDest,
        amount,
        memo,
        sign: signXdr,
      });
      setTx({ status: "success", hash });
      onSuccess();
    } catch (e) {
      setTx({
        status: "error",
        message: e instanceof Error ? e.message : "The transaction failed.",
      });
    }
  }

  function reset() {
    setTx({ status: "idle" });
    setDestination("");
    setAmount("");
    setMemo("");
  }

  if (tx.status === "success") {
    return (
      <section className="rounded-2xl border border-zinc-200 p-6">
        <div className="flex items-center gap-2 text-accent">
          <CheckCircle2 className="h-5 w-5" strokeWidth={2.5} />
          <h2 className="text-base font-semibold text-zinc-900">
            Contribution sent
          </h2>
        </div>
        <p className="mt-2 text-sm text-zinc-500">
          Your payment was confirmed on {NETWORK.label}.
        </p>

        <div className="mt-5 rounded-xl bg-zinc-50 p-4">
          <span className="text-xs font-medium text-zinc-500">
            Transaction hash
          </span>
          <p className="mt-1 font-mono text-sm break-all text-zinc-900">
            {tx.hash}
          </p>
          <div className="mt-3 flex items-center gap-4">
            <CopyButton value={tx.hash} label="Copy hash" />
            <a
              href={NETWORK.explorerTx(tx.hash)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-accent transition-colors hover:text-accent-hover"
            >
              View on Explorer
              <ArrowUpRight className="h-4 w-4" strokeWidth={2.5} />
            </a>
          </div>
        </div>

        <button
          type="button"
          onClick={reset}
          className="mt-5 inline-flex h-10 items-center rounded-full border border-zinc-200 px-5 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-50"
        >
          Send another
        </button>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-zinc-200 p-6">
      <h2 className="text-base font-semibold text-zinc-900">
        Send a contribution
      </h2>
      <p className="mt-1 text-sm text-zinc-500">
        Send XLM to any address on {NETWORK.label} — the first building block of
        a Halka savings circle.
      </p>

      <form onSubmit={onSubmit} className="mt-5 space-y-4">
        <div>
          <label
            htmlFor="destination"
            className="block text-sm font-medium text-zinc-700"
          >
            Recipient address
          </label>
          <input
            id="destination"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="G…"
            spellCheck={false}
            autoComplete="off"
            className="mt-1.5 w-full rounded-xl border border-zinc-200 px-4 py-3 font-mono text-sm outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/20"
          />
          {trimmedDest.length > 0 && !destValid && (
            <p className="mt-1.5 text-sm text-red-600">
              That doesn’t look like a valid Stellar address.
            </p>
          )}
          {selfSend && (
            <p className="mt-1.5 text-sm text-red-600">
              You can’t send to your own address.
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="amount"
            className="block text-sm font-medium text-zinc-700"
          >
            Amount (XLM)
          </label>
          <input
            id="amount"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.0000001"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="mt-1.5 w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm tabular-nums outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/20"
          />
        </div>

        <div>
          <label
            htmlFor="memo"
            className="block text-sm font-medium text-zinc-700"
          >
            Memo <span className="text-zinc-400">(optional)</span>
          </label>
          <input
            id="memo"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            maxLength={28}
            placeholder="e.g. June circle"
            className="mt-1.5 w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/20"
          />
        </div>

        {tx.status === "error" && (
          <div
            className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700"
            role="alert"
          >
            <XCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2.5} />
            <span>{tx.message}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-accent text-sm font-semibold text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-400"
        >
          {tx.status === "submitting" ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.5} />
              Confirm in Freighter…
            </>
          ) : (
            <>
              Send
              {destValid && amountValid && (
                <span className="opacity-80">
                  {amount} XLM to {truncateAddress(trimmedDest)}
                </span>
              )}
            </>
          )}
        </button>
      </form>
    </section>
  );
}
