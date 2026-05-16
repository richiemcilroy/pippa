import type { CSSProperties } from "react";

type Phase = "menstrual" | "follicular" | "ovulation" | "luteal";

const TODAY = 22;
const CYCLE_DAYS = 28;

function phaseFor(day: number): Phase {
  if (day <= 5) return "menstrual";
  if (day <= 13) return "follicular";
  if (day <= 16) return "ovulation";
  return "luteal";
}

const PHASE_DOT: Record<Phase, string> = {
  menstrual: "bg-accent-soft",
  follicular: "bg-beige-soft",
  ovulation: "bg-peach",
  luteal: "bg-beige-warm",
};

export default function CycleVisual() {
  const days = Array.from({ length: CYCLE_DAYS }, (_, i) => i + 1);
  const todayLeft = ((TODAY - 1) / (CYCLE_DAYS - 1)) * 100;
  const todayStyle: CSSProperties = { left: `${todayLeft}%` };

  return (
    <div
      className="relative flex min-h-[220px] w-full flex-col justify-between gap-4 px-5 py-5"
      style={{
        background:
          "radial-gradient(130% 95% at 50% 25%, color-mix(in oklab, var(--beige-soft) 92%, transparent), transparent 78%)",
      }}
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `
@keyframes pippa-cyc-glow {
  0%, 100% { transform: scale(1); opacity: 0.65; }
  50% { transform: scale(1.75); opacity: 0; }
}
@keyframes pippa-cyc-bob {
  0%, 100% { transform: translateX(-50%) translateY(0); }
  50% { transform: translateX(-50%) translateY(-2px); }
}
@keyframes pippa-cyc-dot-rise {
  0% { opacity: 0; transform: translateY(2px); }
  100% { opacity: 1; transform: translateY(0); }
}
.pippa-cyc-glow { animation: pippa-cyc-glow 2.8s ease-out infinite; }
.pippa-cyc-bob { transform: translateX(-50%); animation: pippa-cyc-bob 3.4s ease-in-out infinite; }
.pippa-cyc-dot { animation: pippa-cyc-dot-rise 0.6s ease-out both; }
@media (prefers-reduced-motion: reduce) {
  .pippa-cyc-glow, .pippa-cyc-bob, .pippa-cyc-dot { animation: none !important; }
}
`,
        }}
      />

      <div className="flex items-baseline justify-between gap-2">
        <p className="font-serif text-[24px] italic leading-none tracking-tight text-foreground">
          your week
        </p>
        <span className="rounded-full border border-line/70 bg-surface/80 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-soft">
          day 22 / 28
        </span>
      </div>

      <div className="relative pb-9">
        <div className="flex items-center justify-between">
          {days.map((day, i) => {
            const phase = phaseFor(day);
            const isToday = day === TODAY;
            const dotStyle: CSSProperties = { animationDelay: `${i * 14}ms` };
            return (
              <span
                key={day}
                className="relative flex h-3 w-1.5 items-center justify-center"
              >
                {isToday ? (
                  <>
                    <span
                      aria-hidden
                      className="pippa-cyc-glow absolute h-3 w-3 rounded-full bg-accent"
                    />
                    <span className="pippa-cyc-dot relative h-2 w-2 rounded-full bg-accent shadow-[0_0_0_1.5px_var(--surface)]" />
                  </>
                ) : (
                  <span
                    className={`pippa-cyc-dot h-1 w-1 rounded-full ${PHASE_DOT[phase]}`}
                    style={dotStyle}
                  />
                )}
              </span>
            );
          })}
        </div>

        <div
          aria-hidden
          className="pippa-cyc-bob pointer-events-none absolute top-3 flex flex-col items-center"
          style={todayStyle}
        >
          <span className="h-2 w-px bg-accent/45" />
          <span className="mt-0.5 rounded-md bg-surface/95 px-1.5 py-0.5 font-serif text-[13px] italic leading-none text-accent shadow-[0_4px_12px_-6px_color-mix(in_oklab,var(--accent)_45%,transparent)]">
            you
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-start gap-2 rounded-2xl border border-line/70 bg-beige-soft/70 px-3 py-2">
          <span
            aria-hidden
            className="mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full bg-lavender/80"
          />
          <p className="text-[12.5px] leading-snug text-ink-soft">
            <span className="font-serif text-[14px] italic text-foreground">
              likely
            </span>{" "}
            luteal — hunger{" "}
            <span className="font-serif text-[14px] italic text-foreground">
              may
            </span>{" "}
            feel louder this week.
          </p>
        </div>
        <div className="flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.18em] text-muted/70">
          <span>estimates only</span>
          <span>edit any time</span>
        </div>
      </div>
    </div>
  );
}
