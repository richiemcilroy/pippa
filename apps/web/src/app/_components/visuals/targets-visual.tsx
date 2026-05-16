const TARGETS_VISUAL_STYLES = `
  @keyframes pippa-tgt-rise {
    0% { opacity: 0; transform: translateY(6px); }
    100% { opacity: 1; transform: translateY(0); }
  }
  @keyframes pippa-tgt-num {
    0% { opacity: 0; transform: translateY(6px); letter-spacing: -0.02em; }
    100% { opacity: 1; transform: translateY(0); letter-spacing: -0.01em; }
  }
  @keyframes pippa-tgt-pulse {
    0% { transform: scale(0.7); opacity: 0.55; }
    100% { transform: scale(2.6); opacity: 0; }
  }
  @keyframes pippa-tgt-fill {
    0% { width: 0%; }
    55%, 100% { width: var(--pippa-tgt-fill); }
  }
  @media (prefers-reduced-motion: reduce) {
    .pippa-tgt-card,
    .pippa-tgt-num,
    .pippa-tgt-halo,
    .pippa-tgt-fill {
      animation: none !important;
    }
    .pippa-tgt-fill {
      width: var(--pippa-tgt-fill) !important;
    }
  }
`;

type AnchorRowProps = {
  label: string;
  filled: number;
  target: number;
  unit: string;
  fillTone: "accent" | "beige";
  delay: string;
};

function AnchorRow({ label, filled, target, unit, fillTone, delay }: AnchorRowProps) {
  const pct = Math.min(100, Math.round((filled / target) * 1000) / 10);
  const fillClass = fillTone === "accent" ? "bg-accent/85" : "bg-beige-deep";
  return (
    <div className="flex items-center gap-2.5">
      <span className="w-[44px] shrink-0 text-[11px] tracking-tight text-ink-soft">{label}</span>
      <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-beige/60">
        <span
          className={`pippa-tgt-fill absolute inset-y-0 left-0 rounded-full ${fillClass}`}
          style={{
            ["--pippa-tgt-fill" as string]: `${pct}%`,
            animation: `pippa-tgt-fill 2.6s ease-out ${delay} both`,
          }}
        />
      </div>
      <span className="font-mono text-[10px] tabular-nums text-muted-strong">
        {filled} <span className="text-muted/70">/</span> {target}
        {unit}
      </span>
    </div>
  );
}

export default function TargetsVisual() {
  return (
    <div className="relative h-full w-full">
      <style dangerouslySetInnerHTML={{ __html: TARGETS_VISUAL_STYLES }} />

      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(82% 70% at 50% 46%, color-mix(in oklab, var(--beige-warm) 62%, transparent), transparent 78%)",
        }}
      />

      <div
        className="pippa-tgt-card relative mx-auto flex w-[92%] max-w-[316px] flex-col gap-3 rounded-2xl border border-line-strong/55 bg-paper px-4 pt-3.5 pb-3.5 shadow-[0_1px_0_rgba(28,33,30,0.05),0_14px_32px_-22px_rgba(28,33,30,0.22)]"
        style={{ animation: "pippa-tgt-rise 0.7s ease-out both" }}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute -left-2 -top-2 h-4 w-14 -rotate-[7deg] rounded-[3px] bg-peach/75 shadow-[0_1px_0_rgba(28,33,30,0.05)]"
        />

        <div className="flex items-baseline justify-between">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-strong">
            today
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-beige-soft px-2 py-[3px] text-[10px] tracking-wide text-sage-deep">
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-sage-deep" />
            in range
          </span>
        </div>

        <div className="flex flex-col items-start gap-0.5">
          <span
            className="pippa-tgt-num font-serif text-[44px] italic leading-none tracking-tight text-foreground sm:text-[48px]"
            style={{ animation: "pippa-tgt-num 0.8s ease-out 0.05s both" }}
          >
            1,640
          </span>
          <span className="font-mono text-[11px] tabular-nums text-muted-strong">
            of 1,750 <span className="text-muted/65">–</span> 1,900 kcal
          </span>
        </div>

        <div className="relative pt-2">
          <div className="relative h-[6px] w-full rounded-full bg-beige/55">
            <div className="absolute inset-y-0 left-[20%] right-[20%] rounded-full bg-beige-deep/85" />

            <span
              aria-hidden
              className="absolute -top-1 -bottom-1 left-[50%] w-[2px] -translate-x-1/2 rounded-full bg-ink/45"
            />

            <div className="absolute left-[18%] top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2">
              <span
                aria-hidden
                className="pippa-tgt-halo absolute -inset-1 rounded-full bg-accent/45"
                style={{ animation: "pippa-tgt-pulse 2.6s ease-out infinite" }}
              />
              <span className="absolute inset-0 rounded-full border-[1.5px] border-paper bg-accent shadow-[0_1px_2px_rgba(28,33,30,0.22)]" />
            </div>
          </div>

          <div className="relative mt-1.5 flex justify-between font-mono text-[9px] tabular-nums text-muted/85">
            <span>1,650</span>
            <span>1,750</span>
            <span>1,900</span>
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-line/70 pt-3">
          <AnchorRow
            label="protein"
            filled={112}
            target={120}
            unit="g"
            fillTone="accent"
            delay="0.25s"
          />
          <AnchorRow
            label="fibre"
            filled={28}
            target={30}
            unit="g"
            fillTone="beige"
            delay="0.45s"
          />
        </div>
      </div>
    </div>
  );
}
