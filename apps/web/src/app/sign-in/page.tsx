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
    <main className="min-h-screen bg-background px-5 py-8 text-foreground sm:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-md flex-col justify-center">
        <Link href="/" className="mb-10 text-lg font-semibold text-foreground">
          Pippa
        </Link>

        <section className="rounded-lg border border-line bg-surface p-6 shadow-sm sm:p-8">
          <div className="mb-8 space-y-3">
            <p className="text-sm font-medium text-accent">Email code sign-in</p>
            <h1 className="text-3xl font-semibold text-foreground">Sign in to Pippa</h1>
            <p className="text-base leading-7 text-muted">
              We will send a 6 digit code to your email. No password needed.
            </p>
          </div>

          <SignInForm />
        </section>
      </div>
    </main>
  );
}
