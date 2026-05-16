import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { getAuth } from "@/lib/auth";
import { SignInForm } from "./sign-in-form";

export default async function SignInPage() {
  const session = await getAuth().api.getSession({
    headers: await headers(),
  });

  if (session) {
    redirect("/");
  }

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[-160px] h-[640px] w-[1200px] max-w-[110vw] -translate-x-1/2 rounded-[50%] blur-[80px]"
        style={{
          background:
            "radial-gradient(ellipse at 50% 50%, color-mix(in oklab, var(--beige-warm) 95%, transparent) 0%, color-mix(in oklab, var(--beige) 60%, transparent) 35%, color-mix(in oklab, var(--peach-soft) 50%, transparent) 60%, transparent 80%)",
          opacity: 0.85,
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 left-1/2 h-[380px] w-[820px] max-w-[100vw] -translate-x-1/2 rounded-[50%] blur-[80px]"
        style={{
          background:
            "radial-gradient(ellipse at 50% 50%, color-mix(in oklab, var(--peach-soft) 50%, transparent) 0%, color-mix(in oklab, var(--beige-soft) 40%, transparent) 50%, transparent 75%)",
          opacity: 0.7,
        }}
      />

      <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col px-5 py-6 sm:px-6">
        <header className="flex items-center justify-between">
          <Link
            href="/"
            className="group inline-flex items-center gap-2.5 leading-none"
          >
            <span
              aria-hidden
              className="inline-block h-[28px] w-[28px] shrink-0 rounded-full"
              style={{
                background:
                  "radial-gradient(circle at 32% 28%, #ffe5d0 0%, #ffd2b8 22%, #f0a585 50%, #e07856 76%, #c45f3f 100%)",
                boxShadow:
                  "inset 0 1px 0 rgba(255,255,255,0.55), inset 0 -3px 6px rgba(140,55,32,0.32), 0 6px 14px -6px rgba(224,120,86,0.55)",
              }}
            />
            <span className="serif-display text-[26px] leading-none text-foreground">
              Pippa
            </span>
          </Link>
          <Link
            href="/"
            className="group inline-flex items-center gap-1.5 text-[12px] text-muted-strong transition hover:text-foreground"
          >
            <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3 transition-transform group-hover:-translate-x-0.5">
              <path d="M13 8H3m4 4-4-4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            back home
          </Link>
        </header>

        <div className="flex flex-1 flex-col justify-center py-12">
          <section className="animate-rise overflow-hidden rounded-3xl border border-line/80 bg-surface/85 p-7 shadow-[0_1px_0_rgba(28,33,30,0.04),0_30px_60px_-30px_rgba(28,33,30,0.22)] backdrop-blur-md sm:p-9">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-20 -top-24 h-[220px] w-[220px] rounded-full blur-3xl"
              style={{
                background:
                  "radial-gradient(circle at 50% 50%, color-mix(in oklab, var(--beige-warm) 70%, transparent), transparent 70%)",
              }}
            />

            <div className="relative mb-7 space-y-3">
              <span className="inline-flex items-center gap-2 rounded-full bg-beige-soft px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-ink-soft">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                email code
              </span>
              <h1 className="serif-display text-[34px] leading-[1.05] text-foreground sm:text-[38px]">
                Welcome back to{" "}
                <em className="font-serif italic text-foreground">Pippa</em>.
              </h1>
              <p className="text-[15px] leading-7 text-muted-strong">
                We’ll send a 6-digit code to your email. No passwords, no fuss.
              </p>
            </div>

            <SignInForm />
          </section>

          <p className="mx-auto mt-6 max-w-xs text-center text-[12px] leading-5 text-muted-strong">
            By signing in you agree to our{" "}
            <Link href="/" className="underline decoration-line-strong underline-offset-2 hover:text-foreground">
              terms
            </Link>{" "}
            and{" "}
            <Link href="/" className="underline decoration-line-strong underline-offset-2 hover:text-foreground">
              privacy
            </Link>
            . Pippa is general wellness support, not medical advice.
          </p>

          <div className="pointer-events-none mx-auto mt-8 -rotate-[1.4deg]">
            <span className="inline-block rounded-[3px] border border-line-strong bg-beige-warm px-3 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-soft shadow-[0_2px_0_rgba(28,33,30,0.06)]">
              v0.1 · made for women, by women
            </span>
          </div>
        </div>
      </div>
    </main>
  );
}
