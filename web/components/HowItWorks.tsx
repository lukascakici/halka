import Link from "next/link";
import { ArrowRight } from "lucide-react";

const STEPS = [
  {
    title: "Create or join a circle",
    body: "Set the contribution and collateral, or join an open circle. Each circle is its own Soroban contract.",
  },
  {
    title: "Everyone contributes each round",
    body: "Members send equal amounts into a shared on-chain pot — real XLM, fully transparent.",
  },
  {
    title: "One member receives the pot",
    body: "Each round, the recipient takes the whole pot. They don’t contribute that round — they’re collecting.",
  },
  {
    title: "It rotates until everyone’s paid",
    body: "The turn moves on each round, so every member gets the pot once. Defaults are slashed from collateral.",
  },
];

export function HowItWorks() {
  return (
    <section>
      <div className="max-w-2xl">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          How Halka works
        </h1>
        <p className="mt-4 text-lg leading-8 text-zinc-600 dark:text-zinc-300">
          A savings circle — known as <em>altın günü</em>, ROSCA, tanda, or susu
          — made transparent and enforceable on Stellar. No middleman, no trust
          assumptions: the contract holds the pot and rotates payouts.
        </p>
      </div>

      <ol className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((step, i) => (
          <li
            key={step.title}
            className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-accent-soft text-sm font-semibold text-accent dark:bg-accent/15">
              {i + 1}
            </span>
            <h2 className="mt-4 font-semibold tracking-tight">{step.title}</h2>
            <p className="mt-1.5 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
              {step.body}
            </p>
          </li>
        ))}
      </ol>

      <div className="mt-10">
        <Link
          href="/"
          className="inline-flex h-12 items-center gap-2 rounded-full bg-zinc-950 px-6 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Browse circles
          <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
        </Link>
      </div>
    </section>
  );
}
