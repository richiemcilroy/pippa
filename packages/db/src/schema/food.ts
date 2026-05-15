import { relations } from "drizzle-orm";
import {
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
import {
  createdAtColumn,
  idColumn,
  nullableRefIdColumn,
  nullableUserIdColumn,
  refIdColumn,
  updatedAtColumn,
  userIdColumn,
} from "./shared";
import type { FoodSourceKind, FoodVisibilityMode, LogSourceKind } from "./types";

export const foodItems = mysqlTable(
  "food_items",
  {
    id: idColumn(),
    publicId: varchar("public_id", { length: 32 }).notNull(),
    sourceKind: varchar("source_kind", { length: 32 }).$type<FoodSourceKind>().notNull(),
    sourceExternalId: varchar("source_external_id", { length: 191 }),
    sourceImportBatchId: nullableRefIdColumn("source_import_batch_id"),
    sourceContentHash: varchar("source_content_hash", { length: 64 }),
    ownerUserId: nullableUserIdColumn("owner_user_id"),
    visibility: varchar("visibility", { length: 16 }).$type<FoodVisibilityMode>().notNull().default("public"),
    barcode: varchar("barcode", { length: 14 }),
    gtinValid: tinyint("gtin_valid", { unsigned: true }),
    name: varchar("name", { length: 255 }).notNull(),
    brandName: varchar("brand_name", { length: 191 }),
    nameSortKey: varchar("name_sort_key", { length: 191 }).notNull(),
    brandSortKey: varchar("brand_sort_key", { length: 191 }),
    searchText: text("search_text").notNull(),
    quantityText: varchar("quantity_text", { length: 128 }),
    servingSizeText: varchar("serving_size_text", { length: 128 }),
    servingQuantityCentiG: mediumint("serving_quantity_centi_g", { unsigned: true }),
    packageQuantityCentiG: mediumint("package_quantity_centi_g", { unsigned: true }),
    energyKcal100g: smallint("energy_kcal_100g", { unsigned: true }),
    energyKj100g: smallint("energy_kj_100g", { unsigned: true }),
    protein100gCentiG: smallint("protein_100g_centi_g", { unsigned: true }),
    fibre100gCentiG: smallint("fibre_100g_centi_g", { unsigned: true }),
    fat100gCentiG: smallint("fat_100g_centi_g", { unsigned: true }),
    saturatedFat100gCentiG: smallint("saturated_fat_100g_centi_g", { unsigned: true }),
    carbs100gCentiG: smallint("carbs_100g_centi_g", { unsigned: true }),
    sugars100gCentiG: smallint("sugars_100g_centi_g", { unsigned: true }),
    salt100gMg: mediumint("salt_100g_mg", { unsigned: true }),
    sodium100gMg: mediumint("sodium_100g_mg", { unsigned: true }),
    imageUrl: varchar("image_url", { length: 1024 }),
    imageSmallUrl: varchar("image_small_url", { length: 1024 }),
    dataQualityScore: tinyint("data_quality_score", { unsigned: true }).notNull().default(0),
    popularityScore: int("popularity_score", { unsigned: true }).notNull().default(0),
    sourceUpdatedAtEpoch: int("source_updated_at_epoch", { unsigned: true }),
    sourceLastSeenAt: datetime("source_last_seen_at", { mode: "date", fsp: 3 }),
    sourceDeletedAt: datetime("source_deleted_at", { mode: "date", fsp: 3 }),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    uniqueIndex("food_items_public_id_uq").on(table.publicId),
    uniqueIndex("food_items_barcode_uq").on(table.barcode),
    uniqueIndex("food_items_source_uq").on(table.sourceKind, table.sourceExternalId),
    index("food_items_name_prefix_idx").on(table.nameSortKey, table.brandSortKey),
    index("food_items_visibility_name_idx").on(
      table.visibility,
      table.sourceDeletedAt,
      table.nameSortKey,
      table.brandSortKey,
    ),
    index("food_items_owner_updated_idx").on(table.ownerUserId, table.updatedAt),
    index("food_items_owner_name_idx").on(table.ownerUserId, table.nameSortKey, table.brandSortKey),
    index("food_items_visibility_quality_idx").on(
      table.visibility,
      table.sourceDeletedAt,
      table.dataQualityScore,
      table.popularityScore,
    ),
    index("food_items_import_batch_idx").on(table.sourceImportBatchId),
    index("food_items_source_seen_idx").on(table.sourceKind, table.sourceLastSeenAt),
  ],
);

export const foodImportBatches = mysqlTable(
  "food_import_batches",
  {
    id: idColumn(),
    publicId: varchar("public_id", { length: 32 }).notNull(),
    sourceKind: varchar("source_kind", { length: 32 }).$type<FoodSourceKind>().notNull(),
    sourceDataset: varchar("source_dataset", { length: 64 }).notNull(),
    sourceUrl: varchar("source_url", { length: 1024 }),
    assetKeysUrl: varchar("asset_keys_url", { length: 1024 }),
    downloadedAtEpoch: int("downloaded_at_epoch", { unsigned: true }),
    productRowsSeen: int("product_rows_seen", { unsigned: true }).notNull().default(0),
    ukRowsSeen: int("uk_rows_seen", { unsigned: true }).notNull().default(0),
    outputProductCount: int("output_product_count", { unsigned: true }).notNull().default(0),
    filteredMissingNameCount: int("filtered_missing_name_count", { unsigned: true }).notNull().default(0),
    filteredMissingCoreMacroCount: int("filtered_missing_core_macro_count", { unsigned: true }).notNull().default(0),
    filteredInvalidGtinCount: int("filtered_invalid_gtin_count", { unsigned: true }).notNull().default(0),
    filteredImplausibleNutritionCount: int("filtered_implausible_nutrition_count", { unsigned: true })
      .notNull()
      .default(0),
    contentHash: varchar("content_hash", { length: 64 }),
    metadata: json("metadata").$type<Record<string, unknown>>(),
    createdAt: createdAtColumn(),
  },
  (table) => [
    uniqueIndex("food_import_batches_public_id_uq").on(table.publicId),
    index("food_import_batches_source_created_idx").on(table.sourceKind, table.createdAt),
  ],
);

export const foodItemDetails = mysqlTable(
  "food_item_details",
  {
    id: idColumn(),
    foodItemId: refIdColumn("food_item_id"),
    ingredientsText: text("ingredients_text"),
    categoryText: text("category_text"),
    categoryTags: json("category_tags").$type<string[]>(),
    labelTags: json("label_tags").$type<string[]>(),
    allergenTags: json("allergen_tags").$type<string[]>(),
    traceTags: json("trace_tags").$type<string[]>(),
    storesText: text("stores_text"),
    countriesTags: json("countries_tags").$type<string[]>(),
    nutriscoreGrade: varchar("nutriscore_grade", { length: 24 }),
    novaGroup: tinyint("nova_group", { unsigned: true }),
    ecoscoreGrade: varchar("ecoscore_grade", { length: 24 }),
    sourceUrl: varchar("source_url", { length: 1024 }),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    uniqueIndex("food_item_details_food_uq").on(table.foodItemId),
  ],
);

export const foodItemSourceRefs = mysqlTable(
  "food_item_source_refs",
  {
    id: idColumn(),
    foodItemId: refIdColumn("food_item_id"),
    sourceKind: varchar("source_kind", { length: 32 }).$type<FoodSourceKind>().notNull(),
    sourceExternalId: varchar("source_external_id", { length: 191 }).notNull(),
    barcode: varchar("barcode", { length: 14 }),
    sourceImportBatchId: nullableRefIdColumn("source_import_batch_id"),
    canonicalSourceExternalId: varchar("canonical_source_external_id", { length: 191 }).notNull(),
    canonicalBarcode: varchar("canonical_barcode", { length: 14 }),
    duplicateGroupKey: varchar("duplicate_group_key", { length: 191 }),
    duplicateReason: varchar("duplicate_reason", { length: 64 }),
    isCanonical: tinyint("is_canonical", { unsigned: true }).notNull().default(0),
    sourceContentHash: varchar("source_content_hash", { length: 64 }),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    uniqueIndex("food_item_source_refs_source_external_uq").on(table.sourceKind, table.sourceExternalId),
    uniqueIndex("food_item_source_refs_source_barcode_uq").on(table.sourceKind, table.barcode),
    index("food_item_source_refs_food_idx").on(table.foodItemId),
    index("food_item_source_refs_canonical_idx").on(table.sourceKind, table.canonicalSourceExternalId),
    index("food_item_source_refs_import_batch_idx").on(table.sourceImportBatchId),
  ],
);

export const foodItemRawSources = mysqlTable(
  "food_item_raw_sources",
  {
    id: idColumn(),
    foodItemId: refIdColumn("food_item_id"),
    sourceKind: varchar("source_kind", { length: 32 }).$type<FoodSourceKind>().notNull(),
    sourceContentHash: varchar("source_content_hash", { length: 64 }),
    rawSource: json("raw_source").$type<Record<string, unknown>>().notNull(),
    createdAt: createdAtColumn(),
  },
  (table) => [
    uniqueIndex("food_item_raw_sources_food_uq").on(table.foodItemId),
    index("food_item_raw_sources_source_idx").on(table.sourceKind, table.sourceContentHash),
  ],
);

export const foodItemMarkets = mysqlTable(
  "food_item_markets",
  {
    id: idColumn(),
    foodItemId: refIdColumn("food_item_id"),
    countryCode: varchar("country_code", { length: 2 }).notNull(),
    sourceTag: varchar("source_tag", { length: 64 }).notNull(),
    createdAt: createdAtColumn(),
  },
  (table) => [
    uniqueIndex("food_item_markets_food_country_uq").on(table.foodItemId, table.countryCode),
    index("food_item_markets_country_food_idx").on(table.countryCode, table.foodItemId),
  ],
);

export const foodItemAssets = mysqlTable(
  "food_item_assets",
  {
    id: idColumn(),
    foodItemId: refIdColumn("food_item_id"),
    assetKind: varchar("asset_kind", { length: 32 }).notNull(),
    url: varchar("url", { length: 1024 }).notNull(),
    sourceKey: varchar("source_key", { length: 512 }),
    width: smallint("width", { unsigned: true }),
    height: smallint("height", { unsigned: true }),
    createdAt: createdAtColumn(),
  },
  (table) => [
    index("food_item_assets_food_kind_idx").on(table.foodItemId, table.assetKind),
    uniqueIndex("food_item_assets_source_key_uq").on(table.sourceKey),
  ],
);

export const foodItemServings = mysqlTable(
  "food_item_servings",
  {
    id: idColumn(),
    foodItemId: refIdColumn("food_item_id"),
    servingKind: varchar("serving_kind", { length: 32 }).notNull(),
    label: varchar("label", { length: 128 }).notNull(),
    quantityCentiG: mediumint("quantity_centi_g", { unsigned: true }),
    unit: varchar("unit", { length: 32 }).notNull().default("g"),
    servingCountCenti: mediumint("serving_count_centi", { unsigned: true }),
    isDefault: tinyint("is_default", { unsigned: true }).notNull().default(0),
    source: varchar("source", { length: 32 }).notNull().default("open_food_facts"),
    createdAt: createdAtColumn(),
  },
  (table) => [
    uniqueIndex("food_item_servings_food_kind_label_uq").on(table.foodItemId, table.servingKind, table.label),
    index("food_item_servings_food_default_idx").on(table.foodItemId, table.isDefault),
  ],
);

export const foodSearchAliases = mysqlTable(
  "food_search_aliases",
  {
    id: idColumn(),
    foodItemId: refIdColumn("food_item_id"),
    locale: varchar("locale", { length: 16 }).notNull().default("en-GB"),
    alias: varchar("alias", { length: 255 }).notNull(),
    aliasSortKey: varchar("alias_sort_key", { length: 191 }).notNull(),
    weight: tinyint("weight", { unsigned: true }).notNull().default(1),
    createdAt: createdAtColumn(),
  },
  (table) => [
    uniqueIndex("food_search_aliases_food_locale_alias_uq").on(table.foodItemId, table.locale, table.aliasSortKey),
    index("food_search_aliases_locale_prefix_idx").on(table.locale, table.aliasSortKey, table.weight),
    index("food_search_aliases_food_idx").on(table.foodItemId),
  ],
);

export const userFoodOverrides = mysqlTable(
  "user_food_overrides",
  {
    id: idColumn(),
    publicId: varchar("public_id", { length: 32 }).notNull(),
    userId: userIdColumn(),
    foodItemId: refIdColumn("food_item_id"),
    displayName: varchar("display_name", { length: 255 }),
    brandName: varchar("brand_name", { length: 191 }),
    servingSizeText: varchar("serving_size_text", { length: 128 }),
    servingQuantityCentiG: mediumint("serving_quantity_centi_g", { unsigned: true }),
    energyKcal100g: smallint("energy_kcal_100g", { unsigned: true }),
    energyKj100g: smallint("energy_kj_100g", { unsigned: true }),
    protein100gCentiG: smallint("protein_100g_centi_g", { unsigned: true }),
    fibre100gCentiG: smallint("fibre_100g_centi_g", { unsigned: true }),
    fat100gCentiG: smallint("fat_100g_centi_g", { unsigned: true }),
    saturatedFat100gCentiG: smallint("saturated_fat_100g_centi_g", { unsigned: true }),
    carbs100gCentiG: smallint("carbs_100g_centi_g", { unsigned: true }),
    sugars100gCentiG: smallint("sugars_100g_centi_g", { unsigned: true }),
    salt100gMg: mediumint("salt_100g_mg", { unsigned: true }),
    sodium100gMg: mediumint("sodium_100g_mg", { unsigned: true }),
    editCount: int("edit_count", { unsigned: true }).notNull().default(1),
    lastMealLogItemId: nullableRefIdColumn("last_meal_log_item_id"),
    lastEditedAt: datetime("last_edited_at", { mode: "date", fsp: 3 }).notNull(),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    uniqueIndex("user_food_overrides_public_id_uq").on(table.publicId),
    uniqueIndex("user_food_overrides_user_food_uq").on(table.userId, table.foodItemId),
    index("user_food_overrides_user_recent_idx").on(table.userId, table.lastEditedAt),
  ],
);

export const savedMeals = mysqlTable(
  "saved_meals",
  {
    id: idColumn(),
    publicId: varchar("public_id", { length: 32 }).notNull(),
    userId: userIdColumn(),
    name: varchar("name", { length: 191 }).notNull(),
    nameSortKey: varchar("name_sort_key", { length: 191 }).notNull(),
    sourceLogId: nullableRefIdColumn("source_log_id"),
    totalEnergyKcal: smallint("total_energy_kcal", { unsigned: true }),
    totalProteinCentiG: smallint("total_protein_centi_g", { unsigned: true }),
    totalFibreCentiG: smallint("total_fibre_centi_g", { unsigned: true }),
    totalFatCentiG: smallint("total_fat_centi_g", { unsigned: true }),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    uniqueIndex("saved_meals_public_id_uq").on(table.publicId),
    index("saved_meals_user_updated_idx").on(table.userId, table.updatedAt),
    index("saved_meals_user_name_idx").on(table.userId, table.nameSortKey),
  ],
);

export const savedMealItems = mysqlTable(
  "saved_meal_items",
  {
    id: idColumn(),
    savedMealId: refIdColumn("saved_meal_id"),
    foodItemId: nullableRefIdColumn("food_item_id"),
    sourceKind: varchar("source_kind", { length: 32 }).$type<LogSourceKind>().notNull(),
    position: smallint("position", { unsigned: true }).notNull(),
    itemName: varchar("item_name", { length: 255 }).notNull(),
    servingQuantityCentiG: mediumint("serving_quantity_centi_g", { unsigned: true }),
    unit: varchar("unit", { length: 32 }).notNull().default("g"),
    energyKcal: smallint("energy_kcal", { unsigned: true }),
    proteinCentiG: smallint("protein_centi_g", { unsigned: true }),
    fibreCentiG: smallint("fibre_centi_g", { unsigned: true }),
    fatCentiG: smallint("fat_centi_g", { unsigned: true }),
    carbsCentiG: smallint("carbs_centi_g", { unsigned: true }),
    createdAt: createdAtColumn(),
  },
  (table) => [
    uniqueIndex("saved_meal_items_meal_position_uq").on(table.savedMealId, table.position),
    index("saved_meal_items_food_idx").on(table.foodItemId),
  ],
);

export const foodItemRelations = relations(foodItems, ({ one, many }) => ({
  owner: one(user, {
    fields: [foodItems.ownerUserId],
    references: [user.id],
  }),
  details: one(foodItemDetails, {
    fields: [foodItems.id],
    references: [foodItemDetails.foodItemId],
  }),
  sourceRefs: many(foodItemSourceRefs),
  rawSource: one(foodItemRawSources, {
    fields: [foodItems.id],
    references: [foodItemRawSources.foodItemId],
  }),
  importBatch: one(foodImportBatches, {
    fields: [foodItems.sourceImportBatchId],
    references: [foodImportBatches.id],
  }),
  markets: many(foodItemMarkets),
  assets: many(foodItemAssets),
  servings: many(foodItemServings),
  aliases: many(foodSearchAliases),
  userOverrides: many(userFoodOverrides),
}));

export const foodImportBatchRelations = relations(foodImportBatches, ({ many }) => ({
  items: many(foodItems),
}));

export const foodItemDetailRelations = relations(foodItemDetails, ({ one }) => ({
  foodItem: one(foodItems, {
    fields: [foodItemDetails.foodItemId],
    references: [foodItems.id],
  }),
}));

export const foodItemSourceRefRelations = relations(foodItemSourceRefs, ({ one }) => ({
  foodItem: one(foodItems, {
    fields: [foodItemSourceRefs.foodItemId],
    references: [foodItems.id],
  }),
  importBatch: one(foodImportBatches, {
    fields: [foodItemSourceRefs.sourceImportBatchId],
    references: [foodImportBatches.id],
  }),
}));

export const foodItemRawSourceRelations = relations(foodItemRawSources, ({ one }) => ({
  foodItem: one(foodItems, {
    fields: [foodItemRawSources.foodItemId],
    references: [foodItems.id],
  }),
}));

export const foodItemMarketRelations = relations(foodItemMarkets, ({ one }) => ({
  foodItem: one(foodItems, {
    fields: [foodItemMarkets.foodItemId],
    references: [foodItems.id],
  }),
}));

export const foodItemAssetRelations = relations(foodItemAssets, ({ one }) => ({
  foodItem: one(foodItems, {
    fields: [foodItemAssets.foodItemId],
    references: [foodItems.id],
  }),
}));

export const foodItemServingRelations = relations(foodItemServings, ({ one }) => ({
  foodItem: one(foodItems, {
    fields: [foodItemServings.foodItemId],
    references: [foodItems.id],
  }),
}));

export const foodSearchAliasRelations = relations(foodSearchAliases, ({ one }) => ({
  foodItem: one(foodItems, {
    fields: [foodSearchAliases.foodItemId],
    references: [foodItems.id],
  }),
}));

export const userFoodOverrideRelations = relations(userFoodOverrides, ({ one }) => ({
  user: one(user, {
    fields: [userFoodOverrides.userId],
    references: [user.id],
  }),
  foodItem: one(foodItems, {
    fields: [userFoodOverrides.foodItemId],
    references: [foodItems.id],
  }),
}));

export const savedMealRelations = relations(savedMeals, ({ one, many }) => ({
  user: one(user, {
    fields: [savedMeals.userId],
    references: [user.id],
  }),
  items: many(savedMealItems),
}));

export const savedMealItemRelations = relations(savedMealItems, ({ one }) => ({
  savedMeal: one(savedMeals, {
    fields: [savedMealItems.savedMealId],
    references: [savedMeals.id],
  }),
  foodItem: one(foodItems, {
    fields: [savedMealItems.foodItemId],
    references: [foodItems.id],
  }),
}));
