import { NETWORK } from "@/lib/config";
import { FeedbackWidget } from "./FeedbackWidget";

export function Footer() {
  return (
    <footer className="border-t border-zinc-200 dark:border-zinc-800">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-5 py-6 text-sm text-zinc-400">
        <span>Halka · Stellar {NETWORK.label}</span>
        <FeedbackWidget />
      </div>
    </footer>
  );
}
