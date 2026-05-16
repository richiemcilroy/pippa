"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { authClient } from "@/lib/auth-client";

type Step = "email" | "code";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function getErrorMessage(error: unknown) {
  const code =
    typeof error === "object" && error && "code" in error && typeof error.code === "string"
      ? error.code
      : undefined;

  switch (code) {
    case "INVALID_OTP":
      return "That code isn’t right. Check the email and try again.";
    case "OTP_EXPIRED":
      return "That code expired. Send a fresh one and try again.";
    case "TOO_MANY_ATTEMPTS":
      return "Too many tries. Send a new code before trying again.";
    default:
      return "That didn’t work. Please try again.";
  }
}

const inputClass =
  "h-12 w-full rounded-2xl border border-line bg-surface px-4 text-[15px] text-foreground outline-none transition placeholder:text-muted/70 focus:border-accent/60 focus:bg-surface focus:ring-4 focus:ring-accent/15 hover:border-line-strong";

const primaryButton =
  "group relative inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-foreground px-5 text-[14px] font-medium text-background shadow-[0_10px_28px_-12px_rgba(28,33,30,0.55)] transition-transform duration-200 hover:-translate-y-0.5 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none";

export function SignInForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [isPending, setIsPending] = useState(false);

  async function handleSendCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);

    const nextEmail = normalizeEmail(email);

    if (!nextEmail) {
      setError("Enter your email to receive a sign-in code.");
      return;
    }

    setIsPending(true);
    const result = await authClient.emailOtp.sendVerificationOtp({
      email: nextEmail,
      type: "sign-in",
    });
    setIsPending(false);

    if (result.error) {
      setError(getErrorMessage(result.error));
      return;
    }

    setEmail(nextEmail);
    setOtp("");
    setStep("code");
  }

  async function handleVerifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);

    if (!/^\d{6}$/.test(otp)) {
      setError("Enter the 6-digit code from your email.");
      return;
    }

    setIsPending(true);
    const result = await authClient.signIn.emailOtp({
      email,
      otp,
    });
    setIsPending(false);

    if (result.error) {
      setError(getErrorMessage(result.error));
      return;
    }

    router.replace("/");
    router.refresh();
  }

  if (step === "code") {
    return (
      <form onSubmit={handleVerifyCode} className="space-y-5">
        <div className="space-y-2.5">
          <label htmlFor="otp" className="block text-[13px] font-medium text-foreground">
            6-digit code
          </label>
          <input
            id="otp"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            maxLength={6}
            value={otp}
            onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
            className="h-14 w-full rounded-2xl border border-line bg-surface px-4 text-center font-mono text-2xl tracking-[0.4em] text-foreground outline-none transition placeholder:text-muted/40 focus:border-accent/60 focus:ring-4 focus:ring-accent/15 hover:border-line-strong"
            placeholder="••••••"
            autoFocus
          />
          <p className="text-[12px] text-muted">
            Sent to <span className="font-medium text-foreground">{email}</span>. Codes expire after 5 minutes.
          </p>
        </div>

        {error ? (
          <p
            role="alert"
            className="rounded-2xl border border-danger/30 bg-danger-soft px-4 py-3 text-[13px] leading-5 text-danger"
          >
            {error}
          </p>
        ) : null}

        <button type="submit" disabled={isPending} className={primaryButton}>
          {isPending ? "Checking code…" : "Sign in"}
          {!isPending ? (
            <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5">
              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : null}
        </button>

        <div className="flex items-center justify-between gap-3 pt-1 text-[13px]">
          <button
            type="button"
            onClick={() => {
              setStep("email");
              setOtp("");
              setError(undefined);
            }}
            className="font-medium text-muted transition hover:text-foreground"
          >
            ← Change email
          </button>
          <button
            type="button"
            onClick={async () => {
              setError(undefined);
              setIsPending(true);
              const result = await authClient.emailOtp.sendVerificationOtp({ email, type: "sign-in" });
              setIsPending(false);
              if (result.error) {
                setError(getErrorMessage(result.error));
              }
            }}
            disabled={isPending}
            className="font-medium text-accent transition hover:text-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            Send a new code
          </button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={handleSendCode} className="space-y-5">
      <div className="space-y-2.5">
        <label htmlFor="email" className="block text-[13px] font-medium text-foreground">
          Email
        </label>
        <input
          id="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className={inputClass}
          placeholder="you@example.com"
          autoFocus
        />
      </div>

      {error ? (
        <p
          role="alert"
          className="rounded-2xl border border-danger/30 bg-danger-soft px-4 py-3 text-[13px] leading-5 text-danger"
        >
          {error}
        </p>
      ) : null}

      <button type="submit" disabled={isPending} className={primaryButton}>
        {isPending ? "Sending code…" : "Send sign-in code"}
        {!isPending ? (
          <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5">
            <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : null}
      </button>
    </form>
  );
}
