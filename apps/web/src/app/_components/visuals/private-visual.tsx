const PRIVATE_ROWS = [
  { label: "food log" },
  { label: "cycle data" },
  { label: "weight" },
] as const;

function LockGlyph() {
  return (
    <svg
      viewBox="0 0 12 12"
      className="h-[9px] w-[9px] text-muted-strong"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="2.6" y="5.4" width="6.8" height="5" rx="1.2" />
      <path d="M4.1 5.4V3.7a1.9 1.9 0 0 1 3.8 0v1.7" />
    </svg>
  );
}

export default function PrivateVisual() {
  return (
    <div className="relative h-full w-full">
      <style
        dangerouslySetInnerHTML={{
          __html: `
@keyframes pippa-prv-card {
  0% { opacity: 0; transform: translateY(6px); }
  100% { opacity: 1; transform: translateY(0); }
}
@keyframes pippa-prv-glow {
  0%, 100% { box-shadow: 0 1px 2px rgba(28,33,30,0.18), 0 0 0 0 color-mix(in oklab, var(--sage) 28%, transparent); }
  55% { box-shadow: 0 1px 2px rgba(28,33,30,0.18), 0 0 0 6px color-mix(in oklab, var(--sage) 0%, transparent); }
}
@keyframes pippa-prv-dot {
  0%, 100% { opacity: 0.65; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.18); }
}
@keyframes pippa-prv-stamp {
  0% { opacity: 0; transform: rotate(-12deg) scale(0.85); }
  60% { opacity: 1; transform: rotate(-7deg) scale(1.04); }
  100% { opacity: 1; transform: rotate(-9deg) scale(1); }
}
@keyframes pippa-prv-row {
  0% { opacity: 0; transform: translateY(4px); }
  100% { opacity: 1; transform: translateY(0); }
}
.pippa-prv-card { animation: pippa-prv-card 0.7s ease-out both; }
.pippa-prv-glow { animation: pippa-prv-glow 3s ease-in-out infinite; }
.pippa-prv-dot { animation: pippa-prv-dot 2.6s ease-in-out infinite; }
.pippa-prv-stamp { animation: pippa-prv-stamp 0.9s ease-out 0.55s both; }
.pippa-prv-row { animation: pippa-prv-row 0.5s ease-out both; }
@media (prefers-reduced-motion: reduce) {
  .pippa-prv-card,
  .pippa-prv-glow,
  .pippa-prv-dot,
  .pippa-prv-stamp,
  .pippa-prv-row { animation: none !important; }
}
        `,
        }}
      />

      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(72% 62% at 50% 52%, color-mix(in oklab, var(--beige-warm) 75%, transparent), transparent 78%)",
        }}
      />

      <div className="absolute inset-0 flex items-center justify-center px-4 py-3">
        <div className="pippa-prv-card relative w-full max-w-[280px] rounded-[18px] border border-line-strong/60 bg-paper px-3.5 pt-3 pb-3 shadow-[0_1px_0_rgba(255,255,255,0.6)_inset,0_14px_32px_-22px_rgba(28,33,30,0.28)]">
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-col">
              <span className="text-[12.5px] font-medium leading-tight text-ink">
                Visible to community
              </span>
              <span className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.2em] text-muted/85">
                default · off
              </span>
            </div>

            <div
              role="switch"
              aria-checked="false"
              aria-label="visible to community, off"
              className="relative h-[22px] w-[38px] shrink-0 rounded-full bg-line-strong/65 ring-1 ring-inset ring-line-strong/40"
            >
              <span
                aria-hidden
                className="absolute inset-y-0 right-2 flex items-center font-mono text-[8px] font-semibold uppercase tracking-[0.18em] text-ink-soft/55"
              >
                off
              </span>
              <span
                aria-hidden
                className="pippa-prv-glow absolute left-[2px] top-[2px] h-[18px] w-[18px] rounded-full bg-surface"
              />
            </div>
          </div>

          <div className="my-2.5 h-px w-full bg-line/70" />

          <ul className="flex flex-col gap-1.5">
            {PRIVATE_ROWS.map((row, i) => (
              <li
                key={row.label}
                className="pippa-prv-row flex items-center justify-between rounded-lg border border-line/70 bg-surface/75 px-2.5 py-1.5"
                style={{ animationDelay: `${0.25 + i * 0.09}s` }}
              >
                <div className="flex items-center gap-2">
                  <span
                    aria-hidden
                    className="pippa-prv-dot block h-1.5 w-1.5 rounded-full bg-sage"
                    style={{ animationDelay: `${i * 0.4}s` }}
                  />
                  <span className="text-[11.5px] leading-none text-ink-soft">
                    {row.label}
                  </span>
                </div>
                <div className="inline-flex items-center gap-1 rounded-full border border-line bg-beige-soft/85 px-1.5 py-[2px]">
                  <LockGlyph />
                  <span className="font-mono text-[8.5px] font-medium uppercase tracking-[0.16em] text-muted-strong">
                    private
                  </span>
                </div>
              </li>
            ))}
          </ul>

          <p className="mt-2.5 flex items-baseline gap-1.5 leading-none">
            <span
              aria-hidden
              className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted/75"
            >
              ↳
            </span>
            <span className="font-serif text-[13px] italic leading-tight text-ink-soft">
              you choose what&rsquo;s seen.
            </span>
          </p>

          <div
            aria-hidden
            className="pippa-prv-stamp absolute -right-2.5 -top-2.5 select-none rounded-[5px] border border-accent/45 bg-accent-soft px-2 py-[5px] shadow-[0_4px_10px_-4px_rgba(28,33,30,0.22)]"
          >
            <span className="block font-mono text-[8px] font-semibold uppercase tracking-[0.2em] text-accent">
              private · default
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
