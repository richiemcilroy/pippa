export function PlaceholderVisual({ label }: { label: string }) {
  return (
    <div
      className="relative h-full w-full"
      style={{
        background:
          "radial-gradient(70% 60% at 50% 50%, color-mix(in oklab, var(--beige-warm) 80%, transparent), transparent 75%)",
      }}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted/70">
          {label}
        </span>
      </div>
    </div>
  );
}
