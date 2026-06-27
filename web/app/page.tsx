import { CirclesList } from "@/components/circles/CirclesList";

export default function Home() {
  return (
    <>
      <div className="max-w-2xl">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Save together. <span className="text-accent">On-chain.</span>
        </h1>
        <p className="mt-4 text-lg leading-8 text-zinc-600">
          Halka turns the trusted savings circle into a transparent protocol on
          Stellar. Browse circles or start your own — each one is its own Soroban
          contract.
        </p>
      </div>
      <div className="mt-10">
        <CirclesList />
      </div>
    </>
  );
}
