import { validateOnboardingAnswers, type OnboardingAnswers } from "@pippa/domain";

import { deleteLocalItem, getLocalItem, setLocalItem } from "./local-storage";

const authTokenKey = "pippa.auth-token.v1";
const onboardingKey = "pippa.onboarding.v1";

export function getStoredAuthToken() {
  return getLocalItem(authTokenKey);
}

export function setStoredAuthToken(token: string) {
  return setLocalItem(authTokenKey, token);
}

export function clearStoredAuthToken() {
  return deleteLocalItem(authTokenKey);
}

export async function getStoredOnboarding() {
  const raw = await getLocalItem(onboardingKey);

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    const validation = validateOnboardingAnswers(parsed);

    if (validation.success) {
      return validation.value;
    }
  } catch {
    return null;
  }

  return null;
}

export function setStoredOnboarding(answers: OnboardingAnswers) {
  return setLocalItem(onboardingKey, JSON.stringify(answers));
}
