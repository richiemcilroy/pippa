import Link from "next/link";
import { headers } from "next/headers";

import { getAuth } from "@/lib/auth";
import { SignOutButton } from "./sign-out-button";
import { Bento } from "./_components/bento";

function PippaSphere({ size = 32 }: { size?: number }) {
  return (
    <span
      aria-hidden
      className="inline-block shrink-0 rounded-full"
      style={{
        width: size,
        height: size,
        background:
          "radial-gradient(circle at 32% 28%, #ffe5d0 0%, #ffd2b8 22%, #f0a585 50%, #e07856 76%, #c45f3f 100%)",
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.55), inset 0 -3px 6px rgba(140,55,32,0.32), 0 6px 14px -6px rgba(224,120,86,0.55)",
      }}
    />
  );
}

function Wordmark({
  size = "header",
  href = "/",
}: {
  size?: "header" | "footer";
  href?: string;
}) {
  const sphere = size === "header" ? 30 : 38;
  const text = size === "header" ? "text-[30px]" : "text-[38px]";
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2.5 leading-none"
    >
      <PippaSphere size={sphere} />
      <span className={`serif-display leading-none text-foreground ${text}`}>
        Pippa
      </span>
    </Link>
  );
}

function Header({ session, email }: { session: boolean; email?: string }) {
  return (
    <header className="sticky top-0 z-30 mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-5 py-5 sm:px-8">
      <Wordmark size="header" />
      <nav className="flex items-center gap-2">
        {session ? (
          <>
            <span className="hidden items-center gap-2 rounded-full border border-line bg-surface/70 px-3 py-1.5 text-[12px] text-muted backdrop-blur-md sm:inline-flex">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              {email}
            </span>
            <SignOutButton />
          </>
        ) : (
          <Link
            href="/sign-in"
            className="group inline-flex h-10 items-center justify-center gap-1.5 rounded-full bg-foreground px-4 text-[13px] font-medium text-background transition-colors hover:bg-ink"
          >
            Sign in
            <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3 transition-transform group-hover:translate-x-0.5">
              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        )}
      </nav>
    </header>
  );
}

function HeroHalo() {
  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[-120px] h-[640px] w-[1200px] max-w-[110vw] -translate-x-1/2 rounded-[50%] blur-[80px]"
        style={{
          background:
            "radial-gradient(ellipse at 50% 50%, color-mix(in oklab, var(--beige-warm) 95%, transparent) 0%, color-mix(in oklab, var(--beige) 60%, transparent) 35%, color-mix(in oklab, var(--peach-soft) 50%, transparent) 60%, transparent 80%)",
          opacity: 0.85,
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[120px] h-[420px] w-[820px] max-w-[100vw] -translate-x-1/2 rounded-[50%] blur-[70px]"
        style={{
          background:
            "radial-gradient(ellipse at 50% 50%, color-mix(in oklab, var(--peach) 35%, transparent) 0%, color-mix(in oklab, var(--beige-warm) 30%, transparent) 50%, transparent 75%)",
          opacity: 0.7,
        }}
      />
    </>
  );
}

function SquiggleUnderline() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 320 16"
      preserveAspectRatio="none"
      className="absolute -bottom-2 left-0 right-0 h-3 w-full"
    >
      <path
        d="M2 9 Q 30 2, 60 8 T 118 9 T 176 7 T 234 9 T 292 7 T 318 9"
        fill="none"
        stroke="var(--accent)"
        strokeWidth="2.4"
        strokeLinecap="round"
        opacity="0.85"
      />
    </svg>
  );
}

function Hero({ session, email }: { session: boolean; email?: string }) {
  return (
    <section className="relative mx-auto w-full max-w-5xl overflow-visible px-5 pt-8 pb-20 sm:px-8 sm:pt-14 sm:pb-28">
      <HeroHalo />

      <div className="relative flex flex-col items-center text-center">
        <h1 className="serif-display animate-rise max-w-3xl text-[44px] leading-[1.06] text-foreground sm:text-[68px] sm:leading-[1.02]">
          Weight loss, finally{" "}
          <span className="relative inline-block whitespace-nowrap">
            <em className="font-serif italic">built for women</em>
            <SquiggleUnderline />
          </span>
          .
        </h1>

        <p className="mt-7 max-w-xl text-[17px] leading-8 text-muted-strong sm:text-[18px]">
          Fast food logging, flexible calorie ranges, protein and fibre targets,
          and cycle-aware context without shame or false precision.
        </p>

        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          {session ? (
            <span className="inline-flex h-12 items-center gap-3 rounded-full border border-line-strong bg-beige-soft px-5 text-[14px] text-ink-soft">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              You’re in
              <span className="text-muted">·</span>
              <span className="font-medium text-foreground">{email}</span>
            </span>
          ) : (
            <Link
              href="/sign-in"
              className="group relative inline-flex h-12 items-center justify-center gap-2 rounded-full bg-foreground px-6 text-[14px] font-medium text-background shadow-[0_10px_28px_-12px_rgba(28,33,30,0.55)] transition-transform duration-200 hover:-translate-y-0.5"
            >
              Sign in to Pippa
              <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          )}
          <a
            href="#what"
            className="inline-flex h-12 items-center justify-center rounded-full border border-line-strong bg-surface/60 px-5 text-[14px] font-medium text-foreground backdrop-blur-sm transition hover:border-foreground/30 hover:bg-surface"
          >
            See what it does
          </a>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[12px] text-muted-strong">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-1 w-1 rounded-full bg-foreground/40" />
            Calories, protein, fibre, fat
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-1 w-1 rounded-full bg-foreground/40" />
            Cycle-aware context
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-1 w-1 rounded-full bg-foreground/40" />
            Private by default
          </span>
        </div>

        <div className="pointer-events-none mt-14 hidden -rotate-[1.6deg] sm:block">
          <span
            className="inline-block rounded-[3px] border border-line-strong bg-beige-warm px-3 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-soft shadow-[0_2px_0_rgba(28,33,30,0.06)]"
          >
            v0.1 · made for women, by women
          </span>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="relative mt-32 overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, transparent 0%, color-mix(in oklab, var(--beige-soft) 55%, transparent) 16%, var(--beige-soft) 38%, var(--beige-warm) 100%)",
        }}
      />

      <div className="relative mx-auto w-full max-w-6xl px-5 pt-24 pb-12 sm:px-8 sm:pt-28 sm:pb-14">
        <div className="flex flex-col items-start justify-between gap-10 sm:flex-row sm:items-end sm:gap-8">
          <div className="flex flex-col gap-3">
            <Wordmark size="footer" />
            <span className="text-[12.5px] text-muted-strong">
              built for women. iOS first. coming soon.
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted/80">
              pippa.health
            </span>
          </div>

          <div className="flex flex-col items-start gap-2 sm:items-end">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-ink-soft">
              <Link href="/sign-in" className="transition hover:text-foreground">
                Sign in
              </Link>
              <a href="#what" className="transition hover:text-foreground">
                What it does
              </a>
              <a href="mailto:hello@pippa.health" className="transition hover:text-foreground">
                hello@pippa.health
              </a>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-line-strong/50 bg-surface/70 px-2.5 py-1 text-[11px] text-muted-strong backdrop-blur-sm">
              <span className="h-1 w-1 rounded-full bg-accent" />
              general wellness, not medical advice
            </span>
          </div>
        </div>

        <div className="mt-14 flex items-center justify-between border-t border-line-strong/35 pt-5 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-strong/80">
          <span>© {year} pippa</span>
          <span className="hidden sm:inline">made with care</span>
          <span>v0.1 · early access</span>
        </div>
      </div>
    </footer>
  );
}

export default async function Home() {
  const session = await getAuth().api.getSession({
    headers: await headers(),
  });

  return (
    <main className="relative flex min-h-screen flex-col">
      <Header session={!!session} email={session?.user.email} />
      <Hero session={!!session} email={session?.user.email} />
      <div id="what" className="scroll-mt-24" />
      <Bento />
      <Footer />
    </main>
  );
}
