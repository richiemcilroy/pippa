import { relations } from "drizzle-orm";
import {
  date,
  datetime,
  index,
  int,
  json,
  mediumint,
  mysqlTable,
  smallint,
  text,
  tinyint,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

import { user } from "./auth";
import { foodItems, savedMeals } from "./food";
import { createdAtColumn, idColumn, nullableRefIdColumn, refIdColumn, updatedAtColumn, userIdColumn } from "./shared";
import type { EstimateStatus, LogSourceKind, MealType } from "./types";

export const foodEstimates = mysqlTable(
  "food_estimates",
  {
    id: idColumn(),
    publicId: varchar("public_id", { length: 32 }).notNull(),
    userId: userIdColumn(),
    sourceKind: varchar("source_kind", { length: 32 }).$type<LogSourceKind>().notNull(),
    status: varchar("status", { length: 32 }).$type<EstimateStatus>().notNull().default("draft"),
    confidence: tinyint("confidence", { unsigned: true }),
    modelVersion: varchar("model_version", { length: 64 }),
    clarificationPrompt: varchar("clarification_prompt", { length: 512 }),
    estimatePayload: json("estimate_payload").$type<Record<string, unknown>>(),
    photoAssetKey: varchar("photo_asset_key", { length: 512 }),
    photoRetentionConsentId: nullableRefIdColumn("photo_retention_consent_id"),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    uniqueIndex("food_estimates_public_id_uq").on(table.publicId),
    index("food_estimates_user_status_idx").on(table.userId, table.status, table.createdAt),
  ],
);

export const mealLogs = mysqlTable(
  "meal_logs",
  {
    id: idColumn(),
    publicId: varchar("public_id", { length: 32 }).notNull(),
    userId: userIdColumn(),
    loggedAt: datetime("logged_at", { mode: "date", fsp: 3 }).notNull(),
    logDate: date("log_date", { mode: "string" }).notNull(),
    mealType: varchar("meal_type", { length: 16 }).$type<MealType>().notNull().default("unspecified"),
    sourceKind: varchar("source_kind", { length: 32 }).$type<LogSourceKind>().notNull(),
    foodEstimateId: nullableRefIdColumn("food_estimate_id"),
    note: varchar("note", { length: 512 }),
    deletedAt: datetime("deleted_at", { mode: "date", fsp: 3 }),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    uniqueIndex("meal_logs_public_id_uq").on(table.publicId),
    index("meal_logs_user_day_active_idx").on(table.userId, table.logDate, table.deletedAt, table.loggedAt),
    index("meal_logs_user_recent_active_idx").on(table.userId, table.deletedAt, table.loggedAt),
  ],
);

export const mealLogItems = mysqlTable(
  "meal_log_items",
  {
    id: idColumn(),
    mealLogId: refIdColumn("meal_log_id"),
    userId: userIdColumn(),
    logDate: date("log_date", { mode: "string" }).notNull(),
    foodItemId: nullableRefIdColumn("food_item_id"),
    savedMealId: nullableRefIdColumn("saved_meal_id"),
    sourceKind: varchar("source_kind", { length: 32 }).$type<LogSourceKind>().notNull(),
    position: smallint("position", { unsigned: true }).notNull(),
    itemName: varchar("item_name", { length: 255 }).notNull(),
    brandName: varchar("brand_name", { length: 191 }),
    servingQuantityCentiG: mediumint("serving_quantity_centi_g", { unsigned: true }),
    servingUnit: varchar("serving_unit", { length: 32 }).notNull().default("g"),
    servingCountCenti: mediumint("serving_count_centi", { unsigned: true }),
    energyKcal: smallint("energy_kcal", { unsigned: true }),
    proteinCentiG: smallint("protein_centi_g", { unsigned: true }),
    fibreCentiG: smallint("fibre_centi_g", { unsigned: true }),
    fatCentiG: smallint("fat_centi_g", { unsigned: true }),
    saturatedFatCentiG: smallint("saturated_fat_centi_g", { unsigned: true }),
    carbsCentiG: smallint("carbs_centi_g", { unsigned: true }),
    sugarsCentiG: smallint("sugars_centi_g", { unsigned: true }),
    saltMg: mediumint("salt_mg", { unsigned: true }),
    confidence: tinyint("confidence", { unsigned: true }),
    userEdited: tinyint("user_edited", { unsigned: true }).notNull().default(0),
    editReason: varchar("edit_reason", { length: 64 }),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    uniqueIndex("meal_log_items_log_position_uq").on(table.mealLogId, table.position),
    index("meal_log_items_user_day_meal_idx").on(table.userId, table.logDate, table.mealLogId, table.position),
    index("meal_log_items_food_recent_idx").on(table.foodItemId, table.createdAt),
  ],
);

export const dailyNutritionSummaries = mysqlTable(
  "daily_nutrition_summaries",
  {
    id: idColumn(),
    userId: userIdColumn(),
    summaryDate: date("summary_date", { mode: "string" }).notNull(),
    calorieTarget: smallint("calorie_target", { unsigned: true }),
    calorieLowerBound: smallint("calorie_lower_bound", { unsigned: true }),
    calorieUpperBound: smallint("calorie_upper_bound", { unsigned: true }),
    energyKcal: smallint("energy_kcal", { unsigned: true }).notNull().default(0),
    proteinCentiG: smallint("protein_centi_g", { unsigned: true }).notNull().default(0),
    fibreCentiG: smallint("fibre_centi_g", { unsigned: true }).notNull().default(0),
    fatCentiG: smallint("fat_centi_g", { unsigned: true }).notNull().default(0),
    carbsCentiG: smallint("carbs_centi_g", { unsigned: true }).notNull().default(0),
    mealCount: smallint("meal_count", { unsigned: true }).notNull().default(0),
    loggedItemCount: smallint("logged_item_count", { unsigned: true }).notNull().default(0),
    targetProfileId: nullableRefIdColumn("target_profile_id"),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    uniqueIndex("daily_nutrition_user_date_uq").on(table.userId, table.summaryDate),
  ],
);

export const userFoodRecents = mysqlTable(
  "user_food_recents",
  {
    id: idColumn(),
    userId: userIdColumn(),
    foodItemId: refIdColumn("food_item_id"),
    lastMealLogItemId: nullableRefIdColumn("last_meal_log_item_id"),
    lastLoggedAt: datetime("last_logged_at", { mode: "date", fsp: 3 }).notNull(),
    logCount: int("log_count", { unsigned: true }).notNull().default(1),
    typicalServingQuantityCentiG: mediumint("typical_serving_quantity_centi_g", { unsigned: true }),
    typicalServingUnit: varchar("typical_serving_unit", { length: 32 }),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    uniqueIndex("user_food_recents_user_food_uq").on(table.userId, table.foodItemId),
    index("user_food_recents_user_recent_idx").on(table.userId, table.lastLoggedAt, table.foodItemId),
  ],
);

export const mealLogRelations = relations(mealLogs, ({ one, many }) => ({
  user: one(user, {
    fields: [mealLogs.userId],
    references: [user.id],
  }),
  estimate: one(foodEstimates, {
    fields: [mealLogs.foodEstimateId],
    references: [foodEstimates.id],
  }),
  items: many(mealLogItems),
}));

export const mealLogItemRelations = relations(mealLogItems, ({ one }) => ({
  mealLog: one(mealLogs, {
    fields: [mealLogItems.mealLogId],
    references: [mealLogs.id],
  }),
  foodItem: one(foodItems, {
    fields: [mealLogItems.foodItemId],
    references: [foodItems.id],
  }),
  savedMeal: one(savedMeals, {
    fields: [mealLogItems.savedMealId],
    references: [savedMeals.id],
  }),
}));

export const foodEstimateRelations = relations(foodEstimates, ({ one, many }) => ({
  user: one(user, {
    fields: [foodEstimates.userId],
    references: [user.id],
  }),
  mealLogs: many(mealLogs),
}));

export const dailyNutritionSummaryRelations = relations(dailyNutritionSummaries, ({ one }) => ({
  user: one(user, {
    fields: [dailyNutritionSummaries.userId],
    references: [user.id],
  }),
}));

export const userFoodRecentRelations = relations(userFoodRecents, ({ one }) => ({
  user: one(user, {
    fields: [userFoodRecents.userId],
    references: [user.id],
  }),
  foodItem: one(foodItems, {
    fields: [userFoodRecents.foodItemId],
    references: [foodItems.id],
  }),
}));
