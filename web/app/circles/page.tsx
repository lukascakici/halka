import { CirclesList } from "@/components/circles/CirclesList";

export default function CirclesPage() {
  return (
    <>
      <div className="max-w-2xl">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Savings <span className="text-accent">circles</span>.
        </h1>
        <p className="mt-4 text-lg leading-8 text-zinc-600">
          Browse on-chain circles or start your own. Each circle is its own
          Soroban contract, deployed by the Halka factory.
        </p>
      </div>
      <div className="mt-10">
        <CirclesList />
      </div>
    </>
  );
}
