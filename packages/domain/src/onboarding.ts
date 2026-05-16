export const onboardingSchemaVersion = 1 as const;

export const goalDirections = ["lose", "maintain", "gain"] as const;
export type GoalDirection = (typeof goalDirections)[number];

export const activityLevels = ["low", "light", "moderate", "high"] as const;
export type ActivityLevel = (typeof activityLevels)[number];

export const ageRanges = [
  "under_18",
  "18_24",
  "25_34",
  "35_44",
  "45_54",
  "55_plus",
  "prefer_not_to_say",
] as const;
export type AgeRange = (typeof ageRanges)[number];

export const calorieVisibilityModes = ["visible", "reduced", "hidden"] as const;
export type CalorieVisibilityMode = (typeof calorieVisibilityModes)[number];

export const cycleRegularities = ["regular", "irregular", "unknown"] as const;
export type CycleRegularity = (typeof cycleRegularities)[number];

export type OnboardingAnswers = {
  schemaVersion: typeof onboardingSchemaVersion;
  completedAt: string;
  goal: {
    direction: GoalDirection;
    intensity: number;
    goalWeightKg: number | null;
  };
  body: {
    currentWeightKg: number;
    heightCm: number | null;
    ageRange: AgeRange;
  };
  routine: {
    activityLevel: ActivityLevel;
    cardioSessionsPerWeek: number;
    strengthSessionsPerWeek: number;
  };
  cycle: {
    consent: boolean;
    lastPeriodStartOn: string | null;
    averageCycleLengthDays: number | null;
    periodLengthDays: number | null;
    regularity: CycleRegularity;
  };
  preferences: {
    calorieVisibility: CalorieVisibilityMode;
  };
};

export type OnboardingValidationResult =
  | { success: true; value: OnboardingAnswers }
  | { success: false; issues: string[] };

export function kgToGrams(weightKg: number) {
  return Math.round(weightKg * 1000);
}

export function cmToMillimetres(heightCm: number) {
  return Math.round(heightCm * 10);
}

export function isOnboardingComplete(value: unknown): value is OnboardingAnswers {
  return validateOnboardingAnswers(value).success;
}

export function validateOnboardingAnswers(value: unknown): OnboardingValidationResult {
  const issues: string[] = [];

  if (!isRecord(value)) {
    return { success: false, issues: ["Onboarding answers must be an object."] };
  }

  const schemaVersion = value.schemaVersion;
  const completedAt = value.completedAt;
  const goal = value.goal;
  const body = value.body;
  const routine = value.routine;
  const cycle = value.cycle;
  const preferences = value.preferences;

  if (schemaVersion !== onboardingSchemaVersion) {
    issues.push("Unsupported onboarding schema version.");
  }

  if (!isIsoDateTime(completedAt)) {
    issues.push("Completion date is invalid.");
  }

  if (!isRecord(goal)) {
    issues.push("Goal answers are missing.");
  }

  if (!isRecord(body)) {
    issues.push("Body answers are missing.");
  }

  if (!isRecord(routine)) {
    issues.push("Routine answers are missing.");
  }

  if (!isRecord(cycle)) {
    issues.push("Cycle answers are missing.");
  }

  if (!isRecord(preferences)) {
    issues.push("Preference answers are missing.");
  }

  if (issues.length > 0) {
    return { success: false, issues };
  }

  if (!isRecord(goal) || !isRecord(body) || !isRecord(routine) || !isRecord(cycle) || !isRecord(preferences)) {
    return { success: false, issues: ["Onboarding answers are incomplete."] };
  }

  const goalDirection = goal.direction;
  const goalIntensity = toInteger(goal.intensity);
  const goalWeightKg = toNullableNumber(goal.goalWeightKg);
  const currentWeightKg = toNumber(body.currentWeightKg);
  const heightCm = toNullableNumber(body.heightCm);
  const ageRange = body.ageRange;
  const activityLevel = routine.activityLevel;
  const cardioSessionsPerWeek = toInteger(routine.cardioSessionsPerWeek);
  const strengthSessionsPerWeek = toInteger(routine.strengthSessionsPerWeek);
  const cycleConsent = cycle.consent;
  const lastPeriodStartOn = cycle.lastPeriodStartOn;
  const averageCycleLengthDays = toNullableInteger(cycle.averageCycleLengthDays);
  const periodLengthDays = toNullableInteger(cycle.periodLengthDays);
  const regularity = cycle.regularity;
  const calorieVisibility = preferences.calorieVisibility;

  if (!isOneOf(goalDirection, goalDirections)) {
    issues.push("Goal direction is invalid.");
  }

  if (!isIntegerInRange(goalIntensity, 1, 5)) {
    issues.push("Goal intensity must be between 1 and 5.");
  }

  if (!isNumberInRange(currentWeightKg, 30, 300)) {
    issues.push("Current weight must be between 30kg and 300kg.");
  }

  if (goalWeightKg !== null && !isNumberInRange(goalWeightKg, 30, 300)) {
    issues.push("Goal weight must be between 30kg and 300kg.");
  }

  if (heightCm !== null && !isNumberInRange(heightCm, 120, 230)) {
    issues.push("Height must be between 120cm and 230cm.");
  }

  if (!isOneOf(ageRange, ageRanges)) {
    issues.push("Age range is invalid.");
  }

  if (!isOneOf(activityLevel, activityLevels)) {
    issues.push("Activity level is invalid.");
  }

  if (!isIntegerInRange(cardioSessionsPerWeek, 0, 14)) {
    issues.push("Cardio sessions must be between 0 and 14 per week.");
  }

  if (!isIntegerInRange(strengthSessionsPerWeek, 0, 14)) {
    issues.push("Strength sessions must be between 0 and 14 per week.");
  }

  if (typeof cycleConsent !== "boolean") {
    issues.push("Cycle consent must be true or false.");
  }

  if (!isOneOf(regularity, cycleRegularities)) {
    issues.push("Cycle regularity is invalid.");
  }

  if (cycleConsent === true) {
    if (!isIsoDate(lastPeriodStartOn)) {
      issues.push("Last period start date is required when cycle context is enabled.");
    }

    if (!isIntegerInRange(averageCycleLengthDays, 21, 45)) {
      issues.push("Average cycle length must be between 21 and 45 days.");
    }

    if (!isIntegerInRange(periodLengthDays, 2, 10)) {
      issues.push("Period length must be between 2 and 10 days.");
    }
  }

  if (!isOneOf(calorieVisibility, calorieVisibilityModes)) {
    issues.push("Calorie visibility is invalid.");
  }

  if (issues.length > 0) {
    return { success: false, issues };
  }

  const completedAtValue = isIsoDateTime(completedAt) ? completedAt : "";
  const goalDirectionValue = isOneOf(goalDirection, goalDirections) ? goalDirection : "lose";
  const ageRangeValue = isOneOf(ageRange, ageRanges) ? ageRange : "prefer_not_to_say";
  const activityLevelValue = isOneOf(activityLevel, activityLevels) ? activityLevel : "light";
  const cycleConsentValue = typeof cycleConsent === "boolean" ? cycleConsent : false;
  const lastPeriodStartOnValue = cycleConsentValue && isIsoDate(lastPeriodStartOn) ? lastPeriodStartOn : null;
  const regularityValue = isOneOf(regularity, cycleRegularities) ? regularity : "unknown";
  const calorieVisibilityValue = isOneOf(calorieVisibility, calorieVisibilityModes) ? calorieVisibility : "visible";

  return {
    success: true,
    value: {
      schemaVersion: onboardingSchemaVersion,
      completedAt: completedAtValue,
      goal: {
        direction: goalDirectionValue,
        intensity: goalIntensity,
        goalWeightKg,
      },
      body: {
        currentWeightKg,
        heightCm,
        ageRange: ageRangeValue,
      },
      routine: {
        activityLevel: activityLevelValue,
        cardioSessionsPerWeek,
        strengthSessionsPerWeek,
      },
      cycle: {
        consent: cycleConsentValue,
        lastPeriodStartOn: lastPeriodStartOnValue,
        averageCycleLengthDays: cycleConsentValue ? averageCycleLengthDays : null,
        periodLengthDays: cycleConsentValue ? periodLengthDays : null,
        regularity: cycleConsentValue ? regularityValue : "unknown",
      },
      preferences: {
        calorieVisibility: calorieVisibilityValue,
      },
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isOneOf<const T extends readonly string[]>(value: unknown, options: T): value is T[number] {
  return typeof value === "string" && options.includes(value);
}

function toNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : Number.NaN;
}

function toNullableNumber(value: unknown) {
  return value === null ? null : toNumber(value);
}

function toInteger(value: unknown) {
  const nextValue = toNumber(value);
  return Number.isInteger(nextValue) ? nextValue : Number.NaN;
}

function toNullableInteger(value: unknown) {
  return value === null ? null : toInteger(value);
}

function isNumberInRange(value: number | null, min: number, max: number) {
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
}

function isIntegerInRange(value: number | null, min: number, max: number) {
  return typeof value === "number" && Number.isInteger(value) && value >= min && value <= max;
}

function isIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().startsWith(value);
}

function isIsoDateTime(value: unknown): value is string {
  if (typeof value !== "string") {
    return false;
  }

  const date = new Date(value);
  return Number.isFinite(date.getTime()) && date.toISOString() === value;
}
