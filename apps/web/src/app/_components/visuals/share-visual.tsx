import type { CSSProperties } from "react";

const STYLES = `
  @keyframes pippa-shr-card-breathe {
    0%, 100% { transform: translateY(0) rotate(-1deg); }
    50% { transform: translateY(-4px) rotate(-1deg); }
  }
  @keyframes pippa-shr-handle-glow {
    0%, 100% { box-shadow: 0 1px 2px rgba(28,33,30,0.2), 0 0 0 0 rgba(224,120,86,0); }
    50% { box-shadow: 0 1px 2px rgba(28,33,30,0.2), 0 0 0 4px rgba(224,120,86,0.18); }
  }
  @keyframes pippa-shr-chip-lift {
    0%, 100% { transform: translateY(0); box-shadow: 0 1px 0 rgba(28,33,30,0.05); }
    50% { transform: translateY(-1px); box-shadow: 0 8px 18px -10px rgba(224,120,86,0.45); }
  }
  @keyframes pippa-shr-shine {
    0% { transform: translateX(-180%) skewX(-14deg); opacity: 0; }
    25% { opacity: 1; }
    55%, 100% { transform: translateX(420%) skewX(-14deg); opacity: 0; }
  }
  @keyframes pippa-shr-arrow-nudge {
    0%, 100% { transform: translateX(0); }
    50% { transform: translateX(2px); }
  }
  @keyframes pippa-shr-week-fill {
    0%, 30% { transform: scale(0.4); opacity: 0.4; }
    40%, 100% { transform: scale(1); opacity: 1; }
  }
`;

const CARD_STYLE: CSSProperties = {
  background:
    "linear-gradient(180deg, var(--beige-soft) 0%, var(--paper) 55%, var(--beige) 100%)",
  boxShadow:
    "inset 0 1px 0 rgba(255,255,255,0.7), inset 0 -1px 0 rgba(28,33,30,0.05), 0 14px 28px -18px rgba(28,33,30,0.35)",
  animation: "pippa-shr-card-breathe 6s ease-in-out infinite",
};

const TAPE_STYLE: CSSProperties = {
  background:
    "linear-gradient(180deg, color-mix(in oklab, var(--peach-soft) 92%, white) 0%, var(--peach-soft) 100%)",
  boxShadow: "0 1px 2px rgba(28,33,30,0.10)",
};

const SHINE_STYLE: CSSProperties = {
  background:
    "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.55) 50%, transparent 100%)",
  animation: "pippa-shr-shine 7s ease-in-out infinite",
};

const HANDLE_ON_STYLE: CSSProperties = {
  animation: "pippa-shr-handle-glow 2.6s ease-in-out infinite",
};

const HANDLE_OFF_STYLE: CSSProperties = {
  boxShadow: "0 1px 2px rgba(28,33,30,0.2)",
};

const PROTEIN_CHIP_STYLE: CSSProperties = {
  animation: "pippa-shr-chip-lift 4.6s ease-in-out infinite",
};

const FIBRE_CHIP_STYLE: CSSProperties = {
  animation: "pippa-shr-chip-lift 4.6s ease-in-out infinite",
  animationDelay: "1.2s",
};

const ARROW_STYLE: CSSProperties = {
  animation: "pippa-shr-arrow-nudge 2.4s ease-in-out infinite",
};

const WEEK = [true, true, true, false, true, true, false] as const;

function Toggle({ on }: { on: boolean }) {
  return (
    <span
      className={[
        "relative block h-[14px] w-[26px] shrink-0 rounded-full transition-colors",
        on ? "bg-accent" : "bg-line-strong/70",
      ].join(" ")}
    >
      <span
        className={[
          "absolute top-[2px] block h-[10px] w-[10px] rounded-full bg-white",
          on ? "left-[14px]" : "left-[2px]",
        ].join(" ")}
        style={on ? HANDLE_ON_STYLE : HANDLE_OFF_STYLE}
      />
    </span>
  );
}

type ToggleRowProps = {
  label: string;
  on: boolean;
  hint?: string;
  strikethrough?: boolean;
};

function ToggleRow({ label, on, hint, strikethrough }: ToggleRowProps) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="flex min-w-0 items-baseline gap-1.5">
        <span
          className={[
            "text-[11px] capitalize",
            on ? "text-foreground" : "text-muted/70",
            strikethrough ? "line-through" : "",
          ].join(" ")}
        >
          {label}
        </span>
        {hint ? (
          <span className="font-serif text-[9px] italic text-muted/80">
            {hint}
          </span>
        ) : null}
      </span>
      <Toggle on={on} />
    </div>
  );
}

export default function ShareVisual() {
  return (
    <div className="relative h-full w-full overflow-hidden">
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />

      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(80% 70% at 22% 50%, color-mix(in oklab, var(--peach-soft) 55%, transparent), transparent 75%), radial-gradient(70% 70% at 82% 60%, color-mix(in oklab, var(--beige-warm) 60%, transparent), transparent 75%)",
        }}
      />

      <div className="relative flex h-full w-full items-center justify-center gap-3 px-3 py-4 sm:gap-6">
        <div
          className="relative flex w-[55%] max-w-[260px] shrink-0 flex-col rounded-[16px] border border-line/70 px-3.5 py-3 sm:px-4 sm:py-3.5"
          style={CARD_STYLE}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute -top-1 left-4 h-3.5 w-12 rotate-[-9deg] rounded-[1px]"
            style={TAPE_STYLE}
          />

          <div className="flex items-center justify-between">
            <span className="font-mono text-[8px] uppercase tracking-[0.2em] text-muted/80">
              this week
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-line/80 bg-surface/85 px-1.5 py-[1px] font-mono text-[7px] uppercase tracking-[0.18em] text-muted">
              <span className="block h-1 w-1 rounded-full bg-accent" />
              pippa
            </span>
          </div>

          <p className="mt-2 font-serif text-[17px] italic leading-[1.05] text-foreground sm:text-[20px]">
            12 days of
            <br />
            steady meals.
          </p>

          <div className="mt-2.5 flex flex-wrap gap-1.5">
            <span
              className="inline-flex items-center gap-1 rounded-full border border-line-strong/50 bg-surface/95 px-2 py-[3px] text-[10px] text-ink-soft"
              style={PROTEIN_CHIP_STYLE}
            >
              <span className="block h-1.5 w-1.5 rounded-full bg-accent" />
              Protein <span className="font-mono text-foreground">112g</span>
            </span>
            <span
              className="inline-flex items-center gap-1 rounded-full border border-line-strong/50 bg-surface/95 px-2 py-[3px] text-[10px] text-ink-soft"
              style={FIBRE_CHIP_STYLE}
            >
              <span className="block h-1.5 w-1.5 rounded-full bg-sage" />
              Fibre <span className="font-mono text-foreground">28g</span>
            </span>
          </div>

          <div className="mt-3 flex items-center gap-1.5">
            {WEEK.map((on, i) => (
              <span
                key={i}
                className={[
                  "block h-1.5 w-1.5 rounded-full",
                  on ? "bg-accent" : "bg-line-strong/70",
                ].join(" ")}
                style={{
                  animation: "pippa-shr-week-fill 5s ease-out infinite",
                  animationDelay: `${i * 0.12}s`,
                }}
              />
            ))}
            <span className="ml-auto font-mono text-[8px] tracking-[0.05em] text-muted-strong">
              5/7
            </span>
          </div>

          <p className="mt-2 font-serif text-[10px] italic leading-tight text-muted-strong sm:text-[11px]">
            5 days in range. The week wins.
          </p>

          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 overflow-hidden rounded-[16px]"
          >
            <div
              className="absolute -top-2 -bottom-2 left-0 w-10"
              style={SHINE_STYLE}
            />
          </div>
        </div>

        <div className="relative flex w-[40%] max-w-[200px] shrink-0 flex-col gap-1.5 rounded-2xl border border-line/70 bg-surface/85 p-2.5 backdrop-blur-sm sm:gap-2 sm:p-3">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[8px] uppercase tracking-[0.18em] text-muted/80">
              your card
            </span>
            <span className="font-serif text-[10px] italic text-accent">
              edit
            </span>
          </div>

          <div className="my-0.5 h-px w-full bg-line/70" />

          <ToggleRow
            label="calories"
            on={false}
            hint="hidden"
            strikethrough
          />
          <ToggleRow label="protein" on={true} />
          <ToggleRow label="fibre" on={true} />
          <ToggleRow label="weight" on={false} />

          <div className="mt-1 flex items-center gap-1">
            <svg
              width="18"
              height="12"
              viewBox="0 0 18 12"
              className="text-accent"
              aria-hidden
              style={ARROW_STYLE}
            >
              <path
                d="M1 10 C 4 5, 8 2, 16 2 M 12 0.7 L 16 2 L 14.6 5.6"
                fill="none"
                stroke="currentColor"
                strokeWidth="0.9"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="font-serif text-[11px] italic text-accent">
              you choose
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
