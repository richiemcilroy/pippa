export const authProviderIds = ["email-otp", "credential", "oauth"] as const;
export type AuthProviderId = (typeof authProviderIds)[number];

export const profileStatuses = ["onboarding", "active", "paused", "deleted"] as const;
export type ProfileStatus = (typeof profileStatuses)[number];

export const goalDirections = ["lose", "maintain", "gain"] as const;
export type GoalDirection = (typeof goalDirections)[number];

export const activityLevels = ["low", "light", "moderate", "high"] as const;
export type ActivityLevel = (typeof activityLevels)[number];

export const ageRanges = ["under_18", "18_24", "25_34", "35_44", "45_54", "55_plus", "prefer_not_to_say"] as const;
export type AgeRange = (typeof ageRanges)[number];

export const calorieVisibilityModes = ["visible", "reduced", "hidden"] as const;
export type CalorieVisibilityMode = (typeof calorieVisibilityModes)[number];

export const cycleRegularities = ["regular", "irregular", "unknown"] as const;
export type CycleRegularity = (typeof cycleRegularities)[number];

export const cycleEntrySources = ["manual", "apple_health", "health_connect"] as const;
export type CycleEntrySource = (typeof cycleEntrySources)[number];

export const targetCalculationReasons = ["onboarding", "weight_update", "manual_adjustment", "safety_adjustment"] as const;
export type TargetCalculationReason = (typeof targetCalculationReasons)[number];

export const foodSourceKinds = [
  "open_food_facts",
  "pippa_curated",
  "user_created",
  "ai_photo",
  "label_photo",
  "text",
  "voice",
  "saved_meal",
] as const;
export type FoodSourceKind = (typeof foodSourceKinds)[number];

export const foodVisibilityModes = ["public", "private"] as const;
export type FoodVisibilityMode = (typeof foodVisibilityModes)[number];

export const mealTypes = ["breakfast", "lunch", "dinner", "snack", "drink", "unspecified"] as const;
export type MealType = (typeof mealTypes)[number];

export const logSourceKinds = [
  "barcode",
  "database_search",
  "ai_photo",
  "label_photo",
  "text",
  "voice",
  "saved_meal",
  "user_created_item",
] as const;
export type LogSourceKind = (typeof logSourceKinds)[number];

export const estimateStatuses = ["draft", "needs_clarification", "accepted", "discarded"] as const;
export type EstimateStatus = (typeof estimateStatuses)[number];

export const consentKinds = [
  "cycle_data",
  "health_integration",
  "ai_image_analysis",
  "meal_photo_retention",
  "community_profile",
  "privacy_policy",
  "terms",
] as const;
export type ConsentKind = (typeof consentKinds)[number];

export const consentStatuses = ["granted", "revoked"] as const;
export type ConsentStatus = (typeof consentStatuses)[number];

export const shareCardKinds = ["meal", "weekly_progress", "consistency", "macro_progress"] as const;
export type ShareCardKind = (typeof shareCardKinds)[number];

export const insightKinds = ["daily", "weekly", "cycle_context", "safety"] as const;
export type InsightKind = (typeof insightKinds)[number];

export const safetyEventKinds = ["distress_prompt", "unsafe_target_blocked", "moderation_report", "professional_help_link"] as const;
export type SafetyEventKind = (typeof safetyEventKinds)[number];
