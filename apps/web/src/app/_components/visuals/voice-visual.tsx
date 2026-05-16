const MESSAGES: ReadonlyArray<{ text: string; delay: string }> = [
  {
    text: "\u201CYou are still on track. Your week matters more than today.\u201D",
    delay: "0s",
  },
  {
    text: "\u201CHigher hunger can be normal this week. Anchor your next meal around protein and fibre.\u201D",
    delay: "-10s",
  },
  {
    text: "\u201CThe scale can move before your period. Look at the trend, not today\u2019s number.\u201D",
    delay: "-5s",
  },
];

const SPACER_TEXT = MESSAGES[1].text;

export default function VoiceVisual() {
  return (
    <div className="relative flex w-full flex-col items-center justify-center px-5 py-6 sm:py-7">
      <style
        dangerouslySetInnerHTML={{
          __html: `
@keyframes pippa-vox-cycle {
  0%, 1% { opacity: 0; transform: translateY(8px); }
  4%, 30% { opacity: 1; transform: translateY(0); }
  33%, 100% { opacity: 0; transform: translateY(-8px); }
}
@keyframes pippa-vox-online {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.55; transform: scale(0.85); }
}
@keyframes pippa-vox-halo {
  0%, 100% { opacity: 0.55; transform: scale(1); }
  50% { opacity: 0; transform: scale(1.55); }
}
@keyframes pippa-vox-tape {
  0%, 100% { transform: rotate(4deg) translateY(0); }
  50% { transform: rotate(4deg) translateY(-1px); }
}
@media (prefers-reduced-motion: reduce) {
  .pippa-vox-msg,
  .pippa-vox-dot,
  .pippa-vox-halo,
  .pippa-vox-tape { animation: none !important; }
  .pippa-vox-msg { opacity: 1 !important; transform: none !important; }
  .pippa-vox-msg + .pippa-vox-msg { opacity: 0 !important; }
}
          `,
        }}
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(70% 65% at 50% 42%, color-mix(in oklab, var(--beige-warm) 72%, transparent), transparent 78%)",
        }}
      />

      <div className="relative flex w-full max-w-[520px] flex-col items-stretch gap-3">
        <div className="flex items-center gap-2.5">
          <div className="relative shrink-0">
            <span
              aria-hidden="true"
              className="pippa-vox-halo absolute inset-0 rounded-full"
              style={{
                background:
                  "color-mix(in oklab, var(--accent) 38%, transparent)",
                animation: "pippa-vox-halo 3.2s ease-out infinite",
              }}
            />
            <div className="relative grid h-9 w-9 place-items-center rounded-full bg-accent text-white shadow-[0_6px_16px_-6px_rgba(224,120,86,0.6)]">
              <span className="font-serif text-[19px] italic leading-none">
                P
              </span>
            </div>
          </div>
          <div className="flex min-w-0 flex-col leading-tight">
            <span className="text-[13px] font-medium text-foreground">
              Pippa
            </span>
            <span className="flex items-center gap-1.5 font-serif text-[12px] italic text-muted-strong/85">
              <span
                aria-hidden="true"
                className="pippa-vox-dot h-1.5 w-1.5 rounded-full bg-sage"
                style={{
                  animation: "pippa-vox-online 2.4s ease-in-out infinite",
                }}
              />
              verified safe voice
            </span>
          </div>
        </div>

        <div className="relative w-full rounded-2xl rounded-tl-sm border border-line-strong/45 bg-beige-soft px-5 py-4 shadow-[0_1px_0_rgba(28,33,30,0.04),0_18px_36px_-26px_rgba(28,33,30,0.28)]">
          <span
            aria-hidden="true"
            className="pippa-vox-tape pointer-events-none absolute -top-2 right-4 hidden rounded-[3px] bg-peach px-1.5 py-0.5 font-serif text-[10px] italic text-ink-soft shadow-[0_2px_6px_-3px_rgba(28,33,30,0.35)] sm:inline-block"
            style={{
              animation: "pippa-vox-tape 5.4s ease-in-out infinite",
              transform: "rotate(4deg)",
            }}
          >
            no shame
          </span>

          <p
            aria-hidden="true"
            className="invisible select-none font-serif text-[15px] italic leading-snug text-ink"
          >
            {SPACER_TEXT}
          </p>

          {MESSAGES.map((m, i) => (
            <p
              key={i}
              className="pippa-vox-msg absolute inset-x-5 top-4 font-serif text-[15px] italic leading-snug text-ink"
              style={{
                animation: "pippa-vox-cycle 15s ease-in-out infinite",
                animationDelay: m.delay,
              }}
            >
              {m.text}
            </p>
          ))}
        </div>

        <div className="mt-0.5 flex items-center justify-center gap-2 font-mono text-[9px] uppercase tracking-[0.22em] text-muted/80">
          <span>calm</span>
          <span aria-hidden="true" className="h-1 w-1 rounded-full bg-line-strong" />
          <span>encouraging</span>
          <span aria-hidden="true" className="h-1 w-1 rounded-full bg-line-strong" />
          <span>opinionated</span>
        </div>
      </div>
    </div>
  );
}
