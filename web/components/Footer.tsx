import { NETWORK } from "@/lib/config";

export function Footer() {
  return (
    <footer className="border-t border-zinc-200">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-6 text-sm text-zinc-400">
        <span>Halka · Stellar {NETWORK.label}</span>
        <span>On-chain savings circles</span>
      </div>
    </footer>
  );
}
