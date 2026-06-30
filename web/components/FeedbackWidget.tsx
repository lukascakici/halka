"use client";

import { useState, useCallback, useEffect, type FormEvent } from "react";
import { usePathname } from "next/navigation";
import { MessageSquare, X, CheckCircle2, Loader2 } from "lucide-react";
import { useWallet } from "./WalletProvider";

type Status = "idle" | "submitting" | "success" | "error";

const RATINGS = [1, 2, 3, 4, 5];

export function FeedbackWidget() {
  const pathname = usePathname();
  const { address } = useWallet();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [contact, setContact] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  function reset() {
    setRating(null);
    setMessage("");
    setContact("");
    setStatus("idle");
    setError("");
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (rating === null || status === "submitting") return;
    setStatus("submitting");
    setError("");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          rating,
          message,
          contact,
          wallet: address ?? "",
          path: pathname,
        }),
      });
      if (!res.ok) throw new Error("Request failed");
      setStatus("success");
    } catch {
      setStatus("error");
      setError("Couldn’t send feedback. Please try again.");
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          reset();
          setOpen(true);
        }}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
      >
        <MessageSquare className="h-4 w-4" strokeWidth={2} />
        Feedback
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-zinc-950/40 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-label="Send feedback"
          onMouseDown={(e) => e.target === e.currentTarget && close()}
        >
          <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-start justify-between">
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                Share your feedback
              </h2>
              <button
                type="button"
                onClick={close}
                className="-m-1 rounded-md p-1 text-zinc-400 transition-colors hover:text-zinc-900 dark:hover:text-zinc-100"
                aria-label="Close"
              >
                <X className="h-5 w-5" strokeWidth={2} />
              </button>
            </div>

            {status === "success" ? (
              <div className="mt-6 flex flex-col items-center py-6 text-center">
                <CheckCircle2 className="h-8 w-8 text-accent" strokeWidth={2} />
                <p className="mt-3 text-base font-medium text-zinc-900 dark:text-zinc-100">
                  Thanks for the feedback
                </p>
                <p className="mt-1 text-sm text-zinc-500">
                  It helps us make Halka better.
                </p>
                <button
                  type="button"
                  onClick={close}
                  className="mt-5 inline-flex h-10 items-center rounded-full border border-zinc-200 px-5 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="mt-5 space-y-5">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    How useful is Halka so far?
                  </label>
                  <div className="mt-2 grid grid-cols-5 gap-2">
                    {RATINGS.map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setRating(r)}
                        aria-pressed={rating === r}
                        className={`h-11 rounded-xl border text-sm font-semibold tabular-nums transition-colors ${
                          rating === r
                            ? "border-accent bg-accent text-white"
                            : "border-zinc-200 text-zinc-700 hover:border-zinc-300 dark:border-zinc-700 dark:text-zinc-200 dark:hover:border-zinc-600"
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                  <div className="mt-1.5 flex justify-between text-xs text-zinc-400">
                    <span>Not useful</span>
                    <span>Very useful</span>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="fb-message"
                    className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                  >
                    What could be better?{" "}
                    <span className="text-zinc-400">(optional)</span>
                  </label>
                  <textarea
                    id="fb-message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={3}
                    maxLength={2000}
                    placeholder="Tell us what worked or what was confusing…"
                    className="mt-1.5 w-full resize-none rounded-xl border border-zinc-200 px-4 py-3 text-sm outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="fb-contact"
                    className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                  >
                    Email <span className="text-zinc-400">(optional)</span>
                  </label>
                  <input
                    id="fb-contact"
                    type="email"
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    maxLength={200}
                    placeholder="you@example.com"
                    autoComplete="email"
                    className="mt-1.5 w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  />
                </div>

                {status === "error" && (
                  <p className="text-sm text-red-600 dark:text-red-400" role="alert">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={rating === null || status === "submitting"}
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-accent text-sm font-semibold text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-400 dark:disabled:bg-zinc-800 dark:disabled:text-zinc-600"
                >
                  {status === "submitting" && (
                    <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.5} />
                  )}
                  {status === "submitting" ? "Sending" : "Send feedback"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
