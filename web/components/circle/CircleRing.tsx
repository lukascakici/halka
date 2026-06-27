"use client";

/**
 * The signature Halka visual: members arranged on a ring. The round's recipient
 * is highlighted and the highlight rotates each round. Contributors get a teal
 * ring; members still owing this round stay grey.
 */
export function CircleRing({
  members,
  recipient,
  contributions,
  address,
  started,
  centerTop,
  centerMain,
  centerSub,
}: {
  members: string[];
  recipient: string | null;
  contributions: Record<string, boolean>;
  address: string | null;
  started: boolean;
  centerTop: string;
  centerMain: string;
  centerSub?: string;
}) {
  const n = members.length;

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[300px]">
      {/* ring guide */}
      <div className="absolute left-1/2 top-1/2 h-[76%] w-[76%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-zinc-200" />

      {/* center */}
      <div className="absolute left-1/2 top-1/2 flex w-[44%] -translate-x-1/2 -translate-y-1/2 flex-col items-center text-center">
        <span className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">
          {centerTop}
        </span>
        <span className="mt-0.5 text-2xl font-semibold tracking-tight tabular-nums">
          {centerMain}
        </span>
        {centerSub && (
          <span className="mt-0.5 text-xs text-zinc-500">{centerSub}</span>
        )}
      </div>

      {/* members */}
      {members.map((m, i) => {
        const angle = (i / Math.max(n, 1)) * 2 * Math.PI - Math.PI / 2;
        const x = 50 + 38 * Math.cos(angle);
        const y = 50 + 38 * Math.sin(angle);
        const isRecipient = started && m === recipient;
        const contributed = contributions[m];
        const isYou = m === address;

        const node = isRecipient
          ? "bg-accent text-white border-2 border-accent"
          : started && contributed
            ? "border-2 border-accent bg-white text-zinc-900"
            : started
              ? "border-2 border-zinc-200 bg-white text-zinc-400"
              : "border-2 border-zinc-200 bg-white text-zinc-700";

        return (
          <div
            key={m}
            className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
            style={{ left: `${x}%`, top: `${y}%` }}
          >
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-full font-mono text-xs font-semibold transition-colors sm:h-11 sm:w-11 ${node} ${
                isYou ? "ring-2 ring-accent/40 ring-offset-2" : ""
              }`}
              title={m}
            >
              {m.slice(1, 3)}
            </div>
            {isYou && (
              <span className="mt-1 rounded-full bg-accent-soft px-1.5 text-[10px] font-medium text-accent">
                you
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
