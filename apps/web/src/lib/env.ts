import { Config, Effect, Redacted } from "effect";

const localAuthUrl = "http://localhost:3030";

const authUrlConfig = Config.withDefault(
  Config.orElse(
    Config.orElse(Config.string("BETTER_AUTH_URL"), () => Config.string("NEXT_PUBLIC_BETTER_AUTH_URL")),
    () => Config.string("NEXT_PUBLIC_SITE_URL"),
  ),
  localAuthUrl,
);

export type AuthEnv = {
  authBaseUrl: string;
  betterAuthSecret: string | undefined;
};

let cachedAuthEnv: AuthEnv | undefined;
let cachedResendApiKey: string | undefined;

export function getAuthEnv(): AuthEnv {
  if (cachedAuthEnv) {
    return cachedAuthEnv;
  }

  const env = Effect.runSync(
    Config.all({
      authBaseUrl: authUrlConfig,
      betterAuthSecret: Config.withDefault(Config.redacted("BETTER_AUTH_SECRET"), Redacted.make("")),
    }),
  );

  const betterAuthSecret = Redacted.value(env.betterAuthSecret).trim();

  if (process.env.NODE_ENV === "production" && betterAuthSecret.length < 32) {
    throw new Error("BETTER_AUTH_SECRET must be set to a high-entropy value of at least 32 characters.");
  }

  cachedAuthEnv = {
    authBaseUrl: env.authBaseUrl,
    betterAuthSecret: betterAuthSecret || undefined,
  };

  return cachedAuthEnv;
}

export function getResendApiKey(): string {
  if (cachedResendApiKey) {
    return cachedResendApiKey;
  }

  const apiKey = Effect.runSync(Config.redacted("RESEND_API_KEY"));
  cachedResendApiKey = Redacted.value(apiKey);

  return cachedResendApiKey;
}
