import Link from "next/link";
import { headers } from "next/headers";

import { getAuth } from "@/lib/auth";
import { SignOutButton } from "./sign-out-button";

export default async function Home() {
  const session = await getAuth().api.getSession({
    headers: await headers(),
  });

  return (
    <main className="min-h-screen bg-background px-5 py-8 text-foreground sm:px-8">
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-4xl flex-col justify-center">
        <div className="mb-8 inline-flex w-fit rounded-md border border-line bg-surface px-3 py-1 text-sm font-medium text-muted">
          Web auth preview
        </div>

        <div className="max-w-2xl space-y-5">
          <h1 className="text-4xl font-semibold text-foreground sm:text-5xl">Pippa</h1>
          {session ? (
            <p className="text-lg leading-8 text-muted">
              You are signed in as <span className="font-medium text-foreground">{session.user.email}</span>.
            </p>
          ) : (
            <p className="text-lg leading-8 text-muted">
              Sign in with an email code. The app will bring you back here and show your signed-in state.
            </p>
          )}
        </div>

        {session ? (
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-line bg-surface p-5 shadow-sm">
              <p className="text-sm font-medium text-accent">Session active</p>
              <p className="mt-2 text-sm leading-6 text-muted">Better Auth is reading your secure session cookie on the server.</p>
            </div>
            <div className="rounded-lg border border-line bg-surface p-5 shadow-sm">
              <p className="text-sm font-medium text-accent">Email OTP</p>
              <p className="mt-2 text-sm leading-6 text-muted">Sign-in is using 6 digit codes with a short expiry and limited attempts.</p>
            </div>
          </div>
        ) : null}

        <div className="mt-10 flex flex-wrap gap-3">
          {session ? (
            <SignOutButton />
          ) : (
            <Link
              href="/sign-in"
              className="inline-flex h-11 items-center justify-center rounded-md bg-accent px-5 text-sm font-semibold text-accent-contrast transition hover:bg-accent/90"
            >
              Sign in
            </Link>
          )}
        </div>
      </section>
    </main>
  );
}
