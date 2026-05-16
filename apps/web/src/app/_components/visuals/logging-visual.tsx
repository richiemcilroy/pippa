const keyframes = `
@keyframes pippa-log-type {
  0%, 5% { width: 0%; }
  32%, 76% { width: 100%; }
  86%, 100% { width: 0%; }
}
@keyframes pippa-log-caret {
  0%, 49% { opacity: 1; }
  50%, 100% { opacity: 0; }
}
@keyframes pippa-log-rise-a {
  0%, 36% { opacity: 0; transform: translateY(10px); }
  46%, 84% { opacity: 1; transform: translateY(0); }
  92%, 100% { opacity: 0; transform: translateY(10px); }
}
@keyframes pippa-log-rise-b {
  0%, 50% { opacity: 0; transform: translateY(10px); }
  60%, 84% { opacity: 1; transform: translateY(0); }
  92%, 100% { opacity: 0; transform: translateY(10px); }
}
@keyframes pippa-log-anno {
  0%, 64% { opacity: 0; transform: translateY(4px) rotate(-3deg); }
  74%, 84% { opacity: 1; transform: translateY(0) rotate(-3deg); }
  92%, 100% { opacity: 0; transform: translateY(4px) rotate(-3deg); }
}
@keyframes pippa-log-pulse {
  0%, 30% { opacity: 0.0; transform: scale(0.6); }
  36%, 44% { opacity: 0.9; transform: scale(1); }
  52%, 100% { opacity: 0; transform: scale(0.6); }
}
`;

export default function LoggingVisual() {
  return (
    <div className="@container relative h-[222px] w-full">
      <style dangerouslySetInnerHTML={{ __html: keyframes }} />

      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(78% 72% at 52% 56%, color-mix(in oklab, var(--beige-warm) 62%, transparent), transparent 78%)",
        }}
      />

      <div className="relative flex h-full w-full flex-col gap-3 px-1.5 py-1.5 @[440px]:flex-row @[440px]:items-stretch @[440px]:gap-5 @[440px]:px-2 @[440px]:py-2">
        <div className="flex min-w-0 flex-1 flex-col gap-2.5">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted/70">
              you typed
            </span>
            <span className="h-px flex-1 bg-line" />
          </div>

          <div className="relative rounded-2xl border border-line-strong/55 bg-beige-soft/85 px-3.5 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.65),0_1px_0_rgba(28,33,30,0.05)]">
            <div className="relative inline-block max-w-full align-middle">
              <span className="invisible block whitespace-nowrap font-serif text-[15px] italic leading-tight">
                pret chicken &amp; avocado, oat latte
              </span>
              <span
                className="absolute inset-y-0 left-0 overflow-hidden whitespace-nowrap font-serif text-[15px] italic leading-tight text-ink"
                style={{
                  width: "100%",
                  animation: "pippa-log-type 8s linear infinite",
                }}
              >
                pret chicken &amp; avocado, oat latte
                <span
                  className="ml-[1px] inline-block h-[14px] w-[1.5px] translate-y-[2px] bg-ink/75 align-baseline"
                  style={{ animation: "pippa-log-caret 1.05s steps(2) infinite" }}
                />
              </span>
            </div>
          </div>

          <div className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 pl-0.5">
            <span className="inline-flex items-center gap-1 rounded-full border border-accent/35 bg-accent-soft/85 px-2 py-[2px] text-[10px] font-medium text-accent-hover">
              <span className="h-1 w-1 rounded-full bg-accent" />
              text
            </span>
            <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted/65">
              voice · photo · barcode · saved
            </span>
          </div>
        </div>

        <div className="relative flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted/70">
              today · lunch
            </span>
            <span className="h-px flex-1 bg-line" />
            <span className="font-mono text-[9px] tracking-[0.06em] text-muted/65">
              12:48
            </span>
          </div>

          <div
            className="relative rounded-xl border border-line-strong/45 bg-paper/92 px-3 py-2 shadow-[0_1px_0_rgba(28,33,30,0.04)]"
            style={{ animation: "pippa-log-rise-a 8s ease-out infinite" }}
          >
            <p className="truncate font-serif text-[14.5px] italic leading-snug text-ink">
              Pret chicken &amp; avocado salad
            </p>
            <p className="mt-0.5 truncate font-mono text-[10px] tracking-[0.04em] text-muted-strong">
              <span className="text-ink/55">≈</span>{" "}
              <span className="text-foreground">412</span> kcal
              <span className="mx-1 text-line-strong">·</span>
              <span className="text-foreground">28</span>g protein
              <span className="mx-1 text-line-strong">·</span>
              <span className="text-foreground">9</span>g fibre
            </p>
            <span
              aria-hidden
              className="pointer-events-none absolute -left-1 top-2 hidden h-1.5 w-1.5 rounded-full bg-accent/80 shadow-[0_0_8px_rgba(224,120,86,0.6)] @[440px]:block"
              style={{ animation: "pippa-log-pulse 8s ease-out infinite" }}
            />
          </div>

          <div
            className="relative rounded-xl border border-line-strong/45 bg-paper/92 px-3 py-2 shadow-[0_1px_0_rgba(28,33,30,0.04)]"
            style={{ animation: "pippa-log-rise-b 8s ease-out infinite" }}
          >
            <p className="truncate font-serif text-[14.5px] italic leading-snug text-ink">
              Oat latte
            </p>
            <p className="mt-0.5 truncate font-mono text-[10px] tracking-[0.04em] text-muted-strong">
              <span className="text-ink/55">≈</span>{" "}
              <span className="text-foreground">130</span> kcal
              <span className="mx-1 text-line-strong">·</span>
              <span className="text-foreground">4</span>g protein
            </p>
          </div>

          <div
            className="mt-auto hidden items-center gap-1.5 self-end pr-1 text-accent-hover @[440px]:flex"
            style={{
              animation: "pippa-log-anno 8s ease-out infinite",
              transformOrigin: "right top",
            }}
          >
            <span className="font-serif text-[12px] italic leading-none">
              edit anytime
            </span>
            <svg
              width="22"
              height="14"
              viewBox="0 0 22 14"
              fill="none"
              aria-hidden
              className="text-accent/75"
            >
              <path
                d="M2 12 C 6 4, 13 1, 20 3"
                stroke="currentColor"
                strokeWidth="1.1"
                strokeLinecap="round"
              />
              <path
                d="M16 1 L 20 3 L 17.5 7"
                stroke="currentColor"
                strokeWidth="1.1"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
