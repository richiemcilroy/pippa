import {
  cmToMillimetres,
  kgToGrams,
  validateOnboardingAnswers,
  type OnboardingAnswers,
} from "@pippa/domain";
import {
  consentEvents,
  cycleProfiles,
  getDatabase,
  privacySettings,
  privateProfiles,
  weightEntries,
} from "@pippa/db";
import { eq } from "drizzle-orm";

import { corsOptionsResponse, withCors } from "@/lib/api-cors";
import { getAuth } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await getSession(request);

  if (!session) {
    return json(request, { error: "Unauthorized" }, 401);
  }

  const userId = getNumericUserId(session.user.id);

  if (!userId) {
    return json(request, { error: "Invalid session user." }, 401);
  }

  const db = getDatabase();
  const [profile] = await db
    .select({
      status: privateProfiles.status,
      onboardingCompletedAt: privateProfiles.onboardingCompletedAt,
      onboardingAnswers: privateProfiles.onboardingAnswers,
    })
    .from(privateProfiles)
    .where(eq(privateProfiles.userId, userId))
    .limit(1);

  return json(request, {
    completed: Boolean(profile?.onboardingCompletedAt),
    profile: profile ?? null,
  });
}

export async function POST(request: Request) {
  const session = await getSession(request);

  if (!session) {
    return json(request, { error: "Unauthorized" }, 401);
  }

  const userId = getNumericUserId(session.user.id);

  if (!userId) {
    return json(request, { error: "Invalid session user." }, 401);
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return json(request, { error: "Request body must be valid JSON." }, 400);
  }

  const validation = validateOnboardingAnswers(body);

  if (!validation.success) {
    return json(request, { error: "Onboarding answers are invalid.", issues: validation.issues }, 400);
  }

  const profile = validation.value;
  const db = getDatabase();
  const completedAt = new Date(profile.completedAt);
  const today = new Date().toISOString().slice(0, 10);
  const profileValues = toPrivateProfileValues(userId, profile, completedAt);

  await db
    .insert(privateProfiles)
    .values(profileValues)
    .onDuplicateKeyUpdate({
      set: {
        ...profileValues,
        updatedAt: new Date(),
      },
    });

  await db
    .insert(weightEntries)
    .values({
      userId,
      loggedOn: today,
      weightG: kgToGrams(profile.body.currentWeightKg),
      source: "onboarding",
    })
    .onDuplicateKeyUpdate({
      set: {
        weightG: kgToGrams(profile.body.currentWeightKg),
        source: "onboarding",
        updatedAt: new Date(),
      },
    });

  await db
    .insert(privacySettings)
    .values({
      userId,
      calorieVisibility: profile.preferences.calorieVisibility,
    })
    .onDuplicateKeyUpdate({
      set: {
        calorieVisibility: profile.preferences.calorieVisibility,
        updatedAt: new Date(),
      },
    });

  if (profile.cycle.consent) {
    await db.insert(consentEvents).values({
      userId,
      consentKind: "cycle_data",
      status: "granted",
      source: "mobile_onboarding",
      metadata: {
        schemaVersion: profile.schemaVersion,
        completedAt: profile.completedAt,
      },
    });

    await db
      .insert(cycleProfiles)
      .values({
        userId,
        lastPeriodStartOn: profile.cycle.lastPeriodStartOn,
        averageCycleLengthDays: profile.cycle.averageCycleLengthDays,
        periodLengthDays: profile.cycle.periodLengthDays,
        regularity: profile.cycle.regularity,
        source: "manual",
      })
      .onDuplicateKeyUpdate({
        set: {
          lastPeriodStartOn: profile.cycle.lastPeriodStartOn,
          averageCycleLengthDays: profile.cycle.averageCycleLengthDays,
          periodLengthDays: profile.cycle.periodLengthDays,
          regularity: profile.cycle.regularity,
          source: "manual",
          updatedAt: new Date(),
        },
      });
  } else {
    await db.delete(cycleProfiles).where(eq(cycleProfiles.userId, userId));
  }

  return json(request, { completed: true });
}

export function OPTIONS(request: Request) {
  return corsOptionsResponse(request);
}

async function getSession(request: Request) {
  return getAuth().api.getSession({
    headers: request.headers,
  });
}

function toPrivateProfileValues(userId: number, profile: OnboardingAnswers, completedAt: Date) {
  return {
    userId,
    status: "active" as const,
    ageRange: profile.body.ageRange,
    heightMm: profile.body.heightCm === null ? null : cmToMillimetres(profile.body.heightCm),
    latestWeightG: kgToGrams(profile.body.currentWeightKg),
    goalDirection: profile.goal.direction,
    goalIntensity: profile.goal.intensity,
    goalWeightG: profile.goal.goalWeightKg === null ? null : kgToGrams(profile.goal.goalWeightKg),
    activityLevel: profile.routine.activityLevel,
    cardioSessionsPerWeek: profile.routine.cardioSessionsPerWeek,
    strengthSessionsPerWeek: profile.routine.strengthSessionsPerWeek,
    calorieVisibility: profile.preferences.calorieVisibility,
    onboardingAnswers: profile,
    onboardingCompletedAt: completedAt,
  };
}

function getNumericUserId(userId: string | number) {
  const value = Number(userId);
  return Number.isSafeInteger(value) && value > 0 ? value : null;
}

function json(request: Request, body: unknown, status = 200) {
  return withCors(request, Response.json(body, { status }));
}
