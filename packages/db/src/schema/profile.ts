import { relations } from "drizzle-orm";
import type { OnboardingAnswers } from "@pippa/domain";
import { date, datetime, index, int, json, mysqlTable, smallint, tinyint, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

import { user } from "./auth";
import { createdAtColumn, idColumn, updatedAtColumn, userIdColumn } from "./shared";
import type {
  ActivityLevel,
  AgeRange,
  CalorieVisibilityMode,
  CycleEntrySource,
  CycleRegularity,
  GoalDirection,
  ProfileStatus,
  TargetCalculationReason,
} from "./types";

export const privateProfiles = mysqlTable(
  "private_profiles",
  {
    id: idColumn(),
    userId: userIdColumn(),
    status: varchar("status", { length: 24 }).$type<ProfileStatus>().notNull().default("onboarding"),
    timezone: varchar("timezone", { length: 64 }).notNull().default("Europe/London"),
    locale: varchar("locale", { length: 16 }).notNull().default("en-GB"),
    ageRange: varchar("age_range", { length: 24 }).$type<AgeRange>(),
    heightMm: smallint("height_mm", { unsigned: true }),
    latestWeightG: int("latest_weight_g", { unsigned: true }),
    goalDirection: varchar("goal_direction", { length: 16 }).$type<GoalDirection>().notNull().default("lose"),
    goalIntensity: tinyint("goal_intensity", { unsigned: true }),
    goalWeightG: int("goal_weight_g", { unsigned: true }),
    activityLevel: varchar("activity_level", { length: 24 }).$type<ActivityLevel>().notNull().default("light"),
    cardioSessionsPerWeek: tinyint("cardio_sessions_per_week", { unsigned: true }),
    strengthSessionsPerWeek: tinyint("strength_sessions_per_week", { unsigned: true }),
    dietaryPreferenceTags: json("dietary_preference_tags").$type<string[]>(),
    calorieVisibility: varchar("calorie_visibility", { length: 16 })
      .$type<CalorieVisibilityMode>()
      .notNull()
      .default("visible"),
    onboardingAnswers: json("onboarding_answers").$type<OnboardingAnswers>(),
    onboardingCompletedAt: datetime("onboarding_completed_at", { mode: "date", fsp: 3 }),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    uniqueIndex("private_profiles_user_uq").on(table.userId),
  ],
);

export const weightEntries = mysqlTable(
  "weight_entries",
  {
    id: idColumn(),
    userId: userIdColumn(),
    loggedOn: date("logged_on", { mode: "string" }).notNull(),
    weightG: int("weight_g", { unsigned: true }).notNull(),
    source: varchar("source", { length: 32 }).notNull().default("manual"),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    uniqueIndex("weight_entries_user_day_uq").on(table.userId, table.loggedOn),
  ],
);

export const cycleProfiles = mysqlTable(
  "cycle_profiles",
  {
    id: idColumn(),
    userId: userIdColumn(),
    lastPeriodStartOn: date("last_period_start_on", { mode: "string" }),
    averageCycleLengthDays: tinyint("average_cycle_length_days", { unsigned: true }),
    periodLengthDays: tinyint("period_length_days", { unsigned: true }),
    regularity: varchar("regularity", { length: 16 }).$type<CycleRegularity>().notNull().default("unknown"),
    source: varchar("source", { length: 24 }).$type<CycleEntrySource>().notNull().default("manual"),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    uniqueIndex("cycle_profiles_user_uq").on(table.userId),
  ],
);

export const cycleEntries = mysqlTable(
  "cycle_entries",
  {
    id: idColumn(),
    userId: userIdColumn(),
    entryOn: date("entry_on", { mode: "string" }).notNull(),
    source: varchar("source", { length: 24 }).$type<CycleEntrySource>().notNull().default("manual"),
    isPeriodDay: tinyint("is_period_day", { unsigned: true }).notNull().default(0),
    flowLevel: tinyint("flow_level", { unsigned: true }),
    hungerLevel: tinyint("hunger_level", { unsigned: true }),
    cravingLevel: tinyint("craving_level", { unsigned: true }),
    energyLevel: tinyint("energy_level", { unsigned: true }),
    moodLevel: tinyint("mood_level", { unsigned: true }),
    bloatingLevel: tinyint("bloating_level", { unsigned: true }),
    notes: varchar("notes", { length: 512 }),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    uniqueIndex("cycle_entries_user_day_uq").on(table.userId, table.entryOn),
  ],
);

export const targetProfiles = mysqlTable(
  "target_profiles",
  {
    id: idColumn(),
    userId: userIdColumn(),
    effectiveFrom: date("effective_from", { mode: "string" }).notNull(),
    effectiveTo: date("effective_to", { mode: "string" }),
    calculationVersion: varchar("calculation_version", { length: 32 }).notNull(),
    calculationReason: varchar("calculation_reason", { length: 32 }).$type<TargetCalculationReason>().notNull(),
    calorieTarget: smallint("calorie_target", { unsigned: true }).notNull(),
    calorieLowerBound: smallint("calorie_lower_bound", { unsigned: true }).notNull(),
    calorieUpperBound: smallint("calorie_upper_bound", { unsigned: true }).notNull(),
    activityAdjustmentKcal: smallint("activity_adjustment_kcal").notNull().default(0),
    proteinTargetCentiG: smallint("protein_target_centi_g", { unsigned: true }).notNull(),
    fibreTargetCentiG: smallint("fibre_target_centi_g", { unsigned: true }).notNull(),
    fatTargetCentiG: smallint("fat_target_centi_g", { unsigned: true }).notNull(),
    carbsTargetCentiG: smallint("carbs_target_centi_g", { unsigned: true }),
    safetyFloorApplied: tinyint("safety_floor_applied", { unsigned: true }).notNull().default(0),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    index("target_profiles_user_current_idx").on(table.userId, table.effectiveTo, table.effectiveFrom),
    index("target_profiles_user_history_idx").on(table.userId, table.effectiveFrom),
  ],
);

export const privateProfileRelations = relations(privateProfiles, ({ one }) => ({
  user: one(user, {
    fields: [privateProfiles.userId],
    references: [user.id],
  }),
}));

export const weightEntryRelations = relations(weightEntries, ({ one }) => ({
  user: one(user, {
    fields: [weightEntries.userId],
    references: [user.id],
  }),
}));

export const cycleProfileRelations = relations(cycleProfiles, ({ one }) => ({
  user: one(user, {
    fields: [cycleProfiles.userId],
    references: [user.id],
  }),
}));

export const cycleEntryRelations = relations(cycleEntries, ({ one }) => ({
  user: one(user, {
    fields: [cycleEntries.userId],
    references: [user.id],
  }),
}));

export const targetProfileRelations = relations(targetProfiles, ({ one }) => ({
  user: one(user, {
    fields: [targetProfiles.userId],
    references: [user.id],
  }),
}));
