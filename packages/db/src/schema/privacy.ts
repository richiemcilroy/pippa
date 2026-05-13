import { relations } from "drizzle-orm";
import { date, datetime, index, json, mysqlTable, text, tinyint, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

import { user } from "./auth";
import { mealLogs } from "./logging";
import { createdAtColumn, idColumn, nullableRefIdColumn, updatedAtColumn, userIdColumn } from "./shared";
import type {
  CalorieVisibilityMode,
  ConsentKind,
  ConsentStatus,
  InsightKind,
  SafetyEventKind,
  ShareCardKind,
} from "./types";

export const consentEvents = mysqlTable(
  "consent_events",
  {
    id: idColumn(),
    userId: userIdColumn(),
    consentKind: varchar("consent_kind", { length: 40 }).$type<ConsentKind>().notNull(),
    status: varchar("status", { length: 16 }).$type<ConsentStatus>().notNull(),
    policyVersion: varchar("policy_version", { length: 64 }),
    source: varchar("source", { length: 64 }).notNull(),
    metadata: json("metadata").$type<Record<string, unknown>>(),
    createdAt: createdAtColumn(),
  },
  (table) => [
    index("consent_events_user_kind_recent_idx").on(table.userId, table.consentKind, table.createdAt),
  ],
);

export const privacySettings = mysqlTable(
  "privacy_settings",
  {
    id: idColumn(),
    userId: userIdColumn(),
    calorieVisibility: varchar("calorie_visibility", { length: 16 })
      .$type<CalorieVisibilityMode>()
      .notNull()
      .default("visible"),
    defaultShareCalories: tinyint("default_share_calories", { unsigned: true }).notNull().default(0),
    defaultShareProtein: tinyint("default_share_protein", { unsigned: true }).notNull().default(1),
    defaultShareFibre: tinyint("default_share_fibre", { unsigned: true }).notNull().default(1),
    defaultShareFat: tinyint("default_share_fat", { unsigned: true }).notNull().default(0),
    analyticsHealthDataAllowed: tinyint("analytics_health_data_allowed", { unsigned: true }).notNull().default(0),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [uniqueIndex("privacy_settings_user_uq").on(table.userId)],
);

export const shareCards = mysqlTable(
  "share_cards",
  {
    id: idColumn(),
    publicId: varchar("public_id", { length: 32 }).notNull(),
    userId: userIdColumn(),
    cardKind: varchar("card_kind", { length: 32 }).$type<ShareCardKind>().notNull(),
    mealLogId: nullableRefIdColumn("meal_log_id"),
    weekStartOn: date("week_start_on", { mode: "string" }),
    title: varchar("title", { length: 191 }),
    body: varchar("body", { length: 512 }),
    showCalories: tinyint("show_calories", { unsigned: true }).notNull().default(0),
    showProtein: tinyint("show_protein", { unsigned: true }).notNull().default(1),
    showFibre: tinyint("show_fibre", { unsigned: true }).notNull().default(1),
    showFat: tinyint("show_fat", { unsigned: true }).notNull().default(0),
    showWeight: tinyint("show_weight", { unsigned: true }).notNull().default(0),
    imageAssetKey: varchar("image_asset_key", { length: 512 }),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    uniqueIndex("share_cards_public_id_uq").on(table.publicId),
    index("share_cards_user_recent_idx").on(table.userId, table.createdAt),
    index("share_cards_meal_idx").on(table.mealLogId),
  ],
);

export const dailyInsights = mysqlTable(
  "daily_insights",
  {
    id: idColumn(),
    userId: userIdColumn(),
    insightDate: date("insight_date", { mode: "string" }).notNull(),
    insightKind: varchar("insight_kind", { length: 32 }).$type<InsightKind>().notNull(),
    contentKey: varchar("content_key", { length: 128 }).notNull(),
    cycleContext: varchar("cycle_context", { length: 64 }),
    rationale: varchar("rationale", { length: 512 }),
    payload: json("payload").$type<Record<string, unknown>>(),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    uniqueIndex("daily_insights_user_date_kind_uq").on(table.userId, table.insightDate, table.insightKind),
  ],
);

export const communityProfiles = mysqlTable(
  "community_profiles",
  {
    id: idColumn(),
    publicId: varchar("public_id", { length: 32 }).notNull(),
    userId: userIdColumn(),
    displayName: varchar("display_name", { length: 64 }).notNull(),
    avatarUrl: varchar("avatar_url", { length: 1024 }),
    bio: varchar("bio", { length: 280 }),
    consentEventId: nullableRefIdColumn("consent_event_id"),
    disabledAt: datetime("disabled_at", { mode: "date", fsp: 3 }),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    uniqueIndex("community_profiles_public_id_uq").on(table.publicId),
    uniqueIndex("community_profiles_user_uq").on(table.userId),
    uniqueIndex("community_profiles_display_name_uq").on(table.displayName),
  ],
);

export const safetyEvents = mysqlTable(
  "safety_events",
  {
    id: idColumn(),
    userId: userIdColumn(),
    eventKind: varchar("event_kind", { length: 40 }).$type<SafetyEventKind>().notNull(),
    severity: tinyint("severity", { unsigned: true }).notNull().default(1),
    context: text("context"),
    resolvedAt: datetime("resolved_at", { mode: "date", fsp: 3 }),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    index("safety_events_user_recent_idx").on(table.userId, table.createdAt),
    index("safety_events_kind_severity_idx").on(table.eventKind, table.severity, table.createdAt),
  ],
);

export const consentEventRelations = relations(consentEvents, ({ one }) => ({
  user: one(user, {
    fields: [consentEvents.userId],
    references: [user.id],
  }),
}));

export const privacySettingsRelations = relations(privacySettings, ({ one }) => ({
  user: one(user, {
    fields: [privacySettings.userId],
    references: [user.id],
  }),
}));

export const shareCardRelations = relations(shareCards, ({ one }) => ({
  user: one(user, {
    fields: [shareCards.userId],
    references: [user.id],
  }),
  mealLog: one(mealLogs, {
    fields: [shareCards.mealLogId],
    references: [mealLogs.id],
  }),
}));

export const dailyInsightRelations = relations(dailyInsights, ({ one }) => ({
  user: one(user, {
    fields: [dailyInsights.userId],
    references: [user.id],
  }),
}));

export const communityProfileRelations = relations(communityProfiles, ({ one }) => ({
  user: one(user, {
    fields: [communityProfiles.userId],
    references: [user.id],
  }),
  consentEvent: one(consentEvents, {
    fields: [communityProfiles.consentEventId],
    references: [consentEvents.id],
  }),
}));

export const safetyEventRelations = relations(safetyEvents, ({ one }) => ({
  user: one(user, {
    fields: [safetyEvents.userId],
    references: [user.id],
  }),
}));
