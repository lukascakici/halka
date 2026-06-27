import { CircleDashboard } from "@/components/circle/CircleDashboard";

export default function CirclePage() {
  return (
    <>
      <div className="max-w-2xl">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          The <span className="text-accent">circle</span>.
        </h1>
        <p className="mt-4 text-lg leading-8 text-zinc-600">
          A rotating savings circle running on a Soroban smart contract. Join,
          start a round, and contribute — every action is on-chain and live.
        </p>
      </div>

      <div className="mt-10">
        <CircleDashboard />
      </div>
    </>
  );
}
