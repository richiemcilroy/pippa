import { Platform } from "react-native";

import type { OnboardingAnswers } from "@pippa/domain";

export type AuthUser = {
  id: string | number;
  email: string;
  name?: string;
};

export type AuthSession = {
  user: AuthUser;
  session?: {
    id: string | number;
    expiresAt: string;
  };
};

export type OnboardingStatus = {
  completed: boolean;
  profile: {
    status: string;
    onboardingCompletedAt: string | null;
    onboardingAnswers: OnboardingAnswers | null;
  } | null;
};

type RequestOptions = {
  method?: "GET" | "POST";
  body?: unknown;
  token?: string | null;
};

export class PippaApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "PippaApiError";
    this.status = status;
    this.code = code;
  }
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function sendSignInCode(email: string) {
  await request<{ success: boolean }>("/api/auth/email-otp/send-verification-otp", {
    method: "POST",
    body: {
      email,
      type: "sign-in",
    },
  });
}

export async function verifySignInCode(email: string, otp: string) {
  const { data } = await request<{ token: string; user: AuthUser }>("/api/auth/sign-in/email-otp", {
    method: "POST",
    body: {
      email,
      otp,
    },
  });

  return data;
}

export async function getSession(token: string) {
  const { data } = await request<AuthSession | null>("/api/auth/get-session", {
    token,
  });

  return data;
}

export async function signOut(token: string | null) {
  if (!token) {
    return;
  }

  try {
    await request<{ success: boolean }>("/api/auth/sign-out", {
      method: "POST",
      token,
    });
  } catch {
    // Local sign-out must still clear the device token if the network is down.
  }
}

export async function getOnboardingStatus(token: string) {
  const { data } = await request<OnboardingStatus>("/api/onboarding", {
    token,
  });

  return data;
}

export async function syncOnboarding(token: string, answers: OnboardingAnswers) {
  const { data } = await request<{ completed: boolean }>("/api/onboarding", {
    method: "POST",
    token,
    body: answers,
  });

  return data;
}

async function request<T>(path: string, options: RequestOptions = {}) {
  const headers = new Headers({
    Accept: "application/json",
  });

  if (options.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  if (options.token) {
    headers.set("Authorization", `Bearer ${options.token}`);
  }

  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  const data = await parseResponse(response);

  if (!response.ok) {
    throw new PippaApiError(getMessage(data), response.status, getCode(data));
  }

  return {
    data: data as T,
    authToken: response.headers.get("set-auth-token"),
  };
}

async function parseResponse(response: Response) {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function getApiBaseUrl() {
  const configured = process.env.EXPO_PUBLIC_API_URL?.trim();

  if (configured) {
    return stripTrailingSlash(configured);
  }

  return Platform.OS === "android" ? "http://10.0.2.2:3030" : "http://localhost:3030";
}

function stripTrailingSlash(value: string) {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

function getMessage(value: unknown) {
  if (isRecord(value)) {
    if (typeof value.message === "string") {
      return value.message;
    }

    if (typeof value.error === "string") {
      return value.error;
    }

    if (isRecord(value.error) && typeof value.error.message === "string") {
      return value.error.message;
    }
  }

  return "That did not work. Please try again.";
}

function getCode(value: unknown) {
  if (isRecord(value)) {
    if (typeof value.code === "string") {
      return value.code;
    }

    if (isRecord(value.error) && typeof value.error.code === "string") {
      return value.error.code;
    }
  }

  return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
