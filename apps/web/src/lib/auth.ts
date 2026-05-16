import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { getDatabase } from "@pippa/db";
import * as schema from "@pippa/db/schema";
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { bearer, emailOTP } from "better-auth/plugins";
import { after } from "next/server";

import { sendAuthCodeEmail } from "./auth-email";
import { getAuthEnv } from "./env";

let authInstance: ReturnType<typeof createAuth> | undefined;

function createAuth() {
  const env = getAuthEnv();

  return betterAuth({
    appName: "Pippa",
    baseURL: {
      allowedHosts: ["localhost:3030", "127.0.0.1:3030", "pippa.health", "*.pippa.health", "*.vercel.app"],
      fallback: env.authBaseUrl,
      protocol: "auto",
    },
    secret: env.betterAuthSecret,
    trustedOrigins: [
      "http://localhost:3030",
      "http://127.0.0.1:3030",
      "http://localhost:8081",
      "http://127.0.0.1:8081",
      "http://localhost:19006",
      "http://127.0.0.1:19006",
      "https://pippa.health",
      "https://*.pippa.health",
      "https://*.vercel.app",
    ],
    session: {
      expiresIn: 60 * 60 * 24 * 400,
      updateAge: 60 * 60 * 24,
    },
    database: drizzleAdapter(getDatabase(), {
      provider: "mysql",
      schema,
    }),
    advanced: {
      backgroundTasks: {
        handler: (promise) => {
          after(() => promise);
        },
      },
      database: {
        generateId: "serial",
      },
    },
    experimental: {
      joins: true,
    },
    verification: {
      storeIdentifier: "hashed",
    },
    rateLimit: {
      enabled: true,
      window: 60,
      max: 60,
    },
    plugins: [
      bearer(),
      emailOTP({
        otpLength: 6,
        expiresIn: 300,
        allowedAttempts: 3,
        storeOTP: "hashed",
        rateLimit: {
          window: 60,
          max: 3,
        },
        async sendVerificationOTP({ email, otp, type }) {
          await sendAuthCodeEmail({ email, otp, type });
        },
      }),
      nextCookies(),
    ],
  });
}

export function getAuth() {
  authInstance ??= createAuth();
  return authInstance;
}
