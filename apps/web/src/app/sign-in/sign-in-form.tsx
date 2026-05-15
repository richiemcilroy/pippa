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
      return "That code is not right. Check the email and try again.";
    case "OTP_EXPIRED":
      return "That code has expired. Send a new one and try again.";
    case "TOO_MANY_ATTEMPTS":
      return "Too many tries. Send a new code before trying again.";
    default:
      return "That did not work. Please try again.";
  }
}

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
      setError("Enter the 6 digit code from your email.");
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
      <form onSubmit={handleVerifyCode} className="space-y-6">
        <div className="space-y-2">
          <label htmlFor="otp" className="text-sm font-medium text-foreground">
            6 digit code
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
            className="h-12 w-full rounded-md border border-line bg-surface px-4 text-center font-mono text-xl text-foreground outline-none transition placeholder:text-muted focus:border-accent focus:ring-4 focus:ring-accent/15"
            placeholder="123456"
          />
          <p className="text-sm text-muted">Sent to {email}. Codes expire after 5 minutes.</p>
        </div>

        {error ? (
          <p role="alert" className="rounded-md border border-danger/25 bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isPending}
          className="inline-flex h-12 w-full items-center justify-center rounded-md bg-accent px-5 text-sm font-semibold text-accent-contrast transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Checking code" : "Sign in"}
        </button>

        <div className="flex items-center justify-between gap-3 text-sm">
          <button
            type="button"
            onClick={() => {
              setStep("email");
              setOtp("");
              setError(undefined);
            }}
            className="font-medium text-muted transition hover:text-foreground"
          >
            Change email
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
            className="font-medium text-accent transition hover:text-accent/80 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Send a new code
          </button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={handleSendCode} className="space-y-6">
      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-medium text-foreground">
          Email
        </label>
        <input
          id="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="h-12 w-full rounded-md border border-line bg-surface px-4 text-base text-foreground outline-none transition placeholder:text-muted focus:border-accent focus:ring-4 focus:ring-accent/15"
          placeholder="you@example.com"
        />
      </div>

      {error ? (
        <p role="alert" className="rounded-md border border-danger/25 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex h-12 w-full items-center justify-center rounded-md bg-accent px-5 text-sm font-semibold text-accent-contrast transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Sending code" : "Send sign-in code"}
      </button>
    </form>
  );
}
