"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  async function handleSignOut() {
    setIsPending(true);
    await authClient.signOut();
    router.refresh();
    setIsPending(false);
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={isPending}
      className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-line bg-surface/80 px-3.5 text-[13px] font-medium text-foreground backdrop-blur-md transition hover:border-line-strong hover:bg-surface disabled:cursor-not-allowed disabled:opacity-60"
    >
      {isPending ? "Signing out…" : "Sign out"}
      {!isPending ? (
        <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3 text-muted">
          <path
            d="M10 12l4-4-4-4M14 8H6M9 14H4a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h5"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : null}
    </button>
  );
}
