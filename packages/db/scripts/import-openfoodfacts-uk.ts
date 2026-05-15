import { connect } from "@planetscale/database";
import { createHash } from "node:crypto";
import { createReadStream, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import { cleanCategoryName, cleanFoodBrand, cleanFoodName, foodDedupeKey, foodTextKey } from "@pippa/domain/food-display";

type ProductRow = Record<string, unknown>;
type DatabaseConnection = ReturnType<typeof connect>;
type SanitizedProduct = NonNullable<ReturnType<typeof sanitizedProduct>>;
type ImportRecord = {
  row: ProductRow;
  product: SanitizedProduct;
  canonicalSourceExternalId: string;
  duplicateGroupKey: string;
  isCanonical: boolean;
  duplicateReason: string | null;
};
type PendingImportRecord = {
  row: ProductRow;
  product: SanitizedProduct;
};
type CanonicalGroup = {
  duplicateGroupKey: string;
  canonical: PendingImportRecord;
  records: ImportRecord[];
};
type SourceRefRecord = {
  sourceExternalId: string;
  barcode: string | null;
  canonicalSourceExternalId: string;
  canonicalBarcode: string | null;
  duplicateGroupKey: string;
  isCanonical: boolean;
  duplicateReason: string | null;
  sourceContentHash: string | null;
};

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(SCRIPT_DIR, "../../..");
const DEFAULT_INPUT = resolve(PROJECT_ROOT, "data/openfoodfacts/uk/products.jsonl");
const DEFAULT_SOURCE_REFS_INPUT = resolve(PROJECT_ROOT, "data/openfoodfacts/uk/source_refs.jsonl");
const SOURCE_KIND = "open_food_facts";
const LOCALE = "en-GB";
const UK_TAG_TO_COUNTRY = new Map([
  ["en:united-kingdom", "GB"],
  ["en:england", "GB"],
  ["en:scotland", "GB"],
  ["en:wales", "GB"],
  ["en:northern-ireland", "GB"],
]);

function argValue(name: string, fallback: string) {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : (process.argv[index + 1] ?? fallback);
}

function flagNumber(name: string, fallback: number) {
  const value = Number(argValue(name, String(fallback)));
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

function chunked<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function rowPlaceholders(rowCount: number, columnCount: number) {
  return Array.from({ length: rowCount }, () => `(${Array.from({ length: columnCount }, () => "?").join(", ")})`).join(", ");
}

function valueOf(row: Record<string, unknown>, key: string) {
  return row[key] ?? row[key.toUpperCase()];
}

function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function makePublicId(prefix: string, key: string) {
  return `${prefix}_${hash(key).slice(0, 24)}`;
}

function text(value: unknown, maxLength?: number) {
  const cleaned = decodeHtml(String(value ?? ""))
    .replace(/\u0000/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return maxLength === undefined ? cleaned : cleaned.slice(0, maxLength);
}

function nullableText(value: unknown, maxLength?: number) {
  const cleaned = text(value, maxLength);
  return cleaned.length > 0 ? cleaned : null;
}

function decodeHtml(value: string) {
  return value
    .replace(/&quot;/g, "\"")
    .replace(/&#34;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)));
}

function sortKey(value: unknown, maxLength = 191) {
  return foodTextKey(value, maxLength);
}

function numberValue(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function intValue(value: unknown) {
  const parsed = numberValue(value);
  return parsed === null ? null : Math.round(parsed);
}

function centiG(value: unknown) {
  const parsed = numberValue(value);
  if (parsed === null || parsed <= 0 || parsed * 100 > 16_777_215) {
    return null;
  }
  return Math.round(parsed * 100);
}

function centiGFrom100g(value: unknown) {
  const parsed = numberValue(value);
  if (parsed === null || parsed < 0 || parsed > 100) {
    return null;
  }
  return Math.round(parsed * 100);
}

function mgFromG(value: unknown) {
  const parsed = numberValue(value);
  if (parsed === null || parsed < 0 || parsed > 100) {
    return null;
  }
  return Math.round(parsed * 1000);
}

function tagList(value: unknown) {
  return text(value)
    .split(",")
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);
}

function jsonValue(value: unknown) {
  const list = tagList(value);
  return list.length > 0 ? JSON.stringify(list) : null;
}

function mysqlDatetimeFromEpoch(value: unknown) {
  const epoch = intValue(value);
  if (epoch === null || epoch <= 0) {
    return null;
  }
  return mysqlDatetime(new Date(epoch * 1000));
}

function mysqlDatetime(date: Date) {
  return date.toISOString().slice(0, 23).replace("T", " ");
}

function validGtin(value: string) {
  if (!/^(\d{8}|\d{12}|\d{13}|\d{14})$/.test(value)) {
    return false;
  }
  const digits = value.split("").map(Number);
  const checkDigit = digits.pop();
  let total = 0;
  for (let index = digits.length - 1, position = 1; index >= 0; index -= 1, position += 1) {
    total += digits[index] * (position % 2 === 1 ? 3 : 1);
  }
  return (10 - (total % 10)) % 10 === checkDigit;
}

function hasPlausibleNutrition(row: ProductRow) {
  const kcal = numberValue(row.energy_kcal_100g);
  const kj = numberValue(row.energy_kj_100g);
  const fat = numberValue(row.fat_100g);
  const saturatedFat = numberValue(row.saturated_fat_100g);
  const carbs = numberValue(row.carbohydrates_100g);
  const sugars = numberValue(row.sugars_100g);
  const fibre = numberValue(row.fiber_100g);
  const protein = numberValue(row.proteins_100g);
  const salt = numberValue(row.salt_100g);
  const sodium = numberValue(row.sodium_100g);
  if (kcal === null || kcal < 0 || kcal > 1000) {
    return false;
  }
  if (kj !== null && (kj < 0 || kj > 5000)) {
    return false;
  }
  if (kj !== null) {
    const kcalFromKj = kj / 4.184;
    if (Math.abs(kcal - kcalFromKj) > Math.max(35, kcalFromKj * 0.25)) {
      return false;
    }
  }
  const gramFields = [
    "fat_100g",
    "saturated_fat_100g",
    "carbohydrates_100g",
    "sugars_100g",
    "fiber_100g",
    "proteins_100g",
    "salt_100g",
    "sodium_100g",
  ];
  for (const field of gramFields) {
    const value = numberValue(row[field]);
    if (value !== null && (value < 0 || value > 100)) {
      return false;
    }
  }
  if ((protein ?? 0) + (fat ?? 0) + (carbs ?? 0) + (fibre ?? 0) > 125) {
    return false;
  }
  if (fat !== null && saturatedFat !== null && saturatedFat > fat + 0.5) {
    return false;
  }
  if (carbs !== null && sugars !== null && sugars > carbs + 0.5) {
    return false;
  }
  if (salt !== null && sodium !== null && sodium > salt + 0.05) {
    return false;
  }
  return true;
}

function sanitizedProduct(row: ProductRow) {
  const barcode = nullableText(row.barcode, 14);
  const brandName = cleanFoodBrand(row.brands);
  const categoryName = cleanCategoryName(row.main_category_en ?? row.categories);
  const name = text(cleanFoodName(row.product_name, { brandName, fallbackName: row.generic_name, categoryName }), 255);
  const nameKey = sortKey(name);
  const sourceExternalId = text(row.source_code || row.barcode, 191);
  const gtinValid = text(row.gtin_valid) === "1" || (barcode ? validGtin(barcode) : false);

  if (!name || !nameKey || !sourceExternalId) {
    return null;
  }
  if (
    numberValue(row.energy_kcal_100g) === null ||
    numberValue(row.proteins_100g) === null ||
    numberValue(row.fat_100g) === null ||
    numberValue(row.carbohydrates_100g) === null ||
    !hasPlausibleNutrition(row)
  ) {
    return null;
  }

  return {
    barcode,
    gtinValid: gtinValid ? 1 : 0,
    sourceExternalId,
    publicId: makePublicId("food", `${SOURCE_KIND}:${sourceExternalId}`),
    sourceContentHash: nullableText(row.source_content_hash, 64) ?? hash(JSON.stringify(row)),
    name,
    brandName: nullableText(brandName, 191),
    nameSortKey: nameKey,
    brandSortKey: nullableText(sortKey(brandName), 191),
    searchText: text([name, row.product_name, row.generic_name, brandName, row.brands, row.categories, row.ingredients_text].join(" ")),
    quantityText: nullableText(row.quantity, 128),
    servingSizeText: nullableText(row.serving_size, 128),
    servingQuantityCentiG: centiG(row.serving_quantity),
    packageQuantityCentiG: centiG(row.product_quantity),
    energyKcal100g: intValue(row.energy_kcal_100g),
    energyKj100g: intValue(row.energy_kj_100g),
    protein100gCentiG: centiGFrom100g(row.proteins_100g),
    fibre100gCentiG: centiGFrom100g(row.fiber_100g),
    fat100gCentiG: centiGFrom100g(row.fat_100g),
    saturatedFat100gCentiG: centiGFrom100g(row.saturated_fat_100g),
    carbs100gCentiG: centiGFrom100g(row.carbohydrates_100g),
    sugars100gCentiG: centiGFrom100g(row.sugars_100g),
    salt100gMg: mgFromG(row.salt_100g),
    sodium100gMg: mgFromG(row.sodium_100g),
    imageUrl: nullableText(row.image_url, 1024),
    imageSmallUrl: nullableText(row.image_small_url, 1024),
    dataQualityScore: intValue(row.data_quality_score) ?? 0,
    popularityScore: intValue(row.popularity_score) ?? 0,
    sourceUpdatedAtEpoch: intValue(row.last_modified_t),
    sourceLastSeenAt: mysqlDatetime(new Date()),
  };
}

function canonicalGroupKey(record: PendingImportRecord) {
  return foodDedupeKey({
    source: SOURCE_KIND,
    name: record.product.name,
    brand: record.product.brandName,
    category: record.row.main_category_en ?? record.row.categories,
  });
}

function canonicalScore(record: PendingImportRecord) {
  const row = record.row;
  const product = record.product;
  let score = product.dataQualityScore * 100 + product.popularityScore;
  score += product.imageUrl || product.imageSmallUrl ? 35 : 0;
  score += product.servingQuantityCentiG ? 25 : 0;
  score += product.packageQuantityCentiG ? 10 : 0;
  score += nullableText(row.ingredients_text) ? 25 : 0;
  score += nullableText(row.stores) ? 10 : 0;
  score += product.sourceUpdatedAtEpoch ? Math.min(product.sourceUpdatedAtEpoch / 100_000_000, 20) : 0;
  return score;
}

function canonicalGroups(records: PendingImportRecord[]) {
  const groupsByKey = new Map<string, PendingImportRecord[]>();
  for (const record of records) {
    const key = canonicalGroupKey(record);
    groupsByKey.set(key, [...(groupsByKey.get(key) ?? []), record]);
  }

  const groups: CanonicalGroup[] = [];
  for (const [duplicateGroupKey, groupRecords] of groupsByKey) {
    const canonical = [...groupRecords].sort(
      (a, b) => canonicalScore(b) - canonicalScore(a) || a.product.sourceExternalId.localeCompare(b.product.sourceExternalId),
    )[0];
    if (!canonical) {
      continue;
    }

    groups.push({
      duplicateGroupKey,
      canonical,
      records: groupRecords.map((record) => ({
        ...record,
        canonicalSourceExternalId: canonical.product.sourceExternalId,
        duplicateGroupKey,
        isCanonical: record.product.sourceExternalId === canonical.product.sourceExternalId,
        duplicateReason: record.product.sourceExternalId === canonical.product.sourceExternalId ? null : "same_clean_brand_name",
      })),
    });
  }

  return groups.sort((a, b) => a.canonical.product.sourceExternalId.localeCompare(b.canonical.product.sourceExternalId));
}

function groupChunks(groups: CanonicalGroup[], maxRecords: number) {
  const chunks: CanonicalGroup[][] = [];
  let current: CanonicalGroup[] = [];
  let currentSize = 0;

  for (const group of groups) {
    if (current.length > 0 && currentSize + group.records.length > maxRecords) {
      chunks.push(current);
      current = [];
      currentSize = 0;
    }
    current.push(group);
    currentSize += group.records.length;
  }

  if (current.length > 0) {
    chunks.push(current);
  }

  return chunks;
}

async function insertImportBatch(conn: DatabaseConnection, input: string, limit: number) {
  const batchPublicId = makePublicId("fib", `${input}:${limit}:${Date.now()}`);
  await conn.execute(
    `insert into food_import_batches
      (public_id, source_kind, source_dataset, source_url, asset_keys_url, downloaded_at_epoch, metadata)
     values (?, ?, ?, ?, ?, ?, ?)`,
    [
      batchPublicId,
      SOURCE_KIND,
      "openfoodfacts_uk_filtered_jsonl",
      "https://static.openfoodfacts.org/data/en.openfoodfacts.org.products.csv.gz",
      "https://openfoodfacts-images.s3.eu-west-3.amazonaws.com/data/data_keys.gz",
      Math.floor(Date.now() / 1000),
      JSON.stringify({ input, limit }),
    ],
  );
  const result = await conn.execute("select id from food_import_batches where public_id = ?", [batchPublicId]);
  return Number(valueOf(result.rows[0] ?? {}, "id"));
}

async function upsertFoodItem(conn: DatabaseConnection, product: SanitizedProduct, batchId: number) {
  await conn.execute(
    `insert into food_items
      (public_id, source_kind, source_external_id, source_import_batch_id, source_content_hash, visibility, barcode,
       gtin_valid, name, brand_name, name_sort_key, brand_sort_key, search_text, quantity_text, serving_size_text,
       serving_quantity_centi_g, package_quantity_centi_g, energy_kcal_100g, energy_kj_100g, protein_100g_centi_g,
       fibre_100g_centi_g, fat_100g_centi_g, saturated_fat_100g_centi_g, carbs_100g_centi_g, sugars_100g_centi_g,
       salt_100g_mg, sodium_100g_mg, image_url, image_small_url, data_quality_score, popularity_score,
       source_updated_at_epoch, source_last_seen_at, source_deleted_at)
     values (?, ?, ?, ?, ?, 'public', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, null)
     on duplicate key update
       source_import_batch_id = values(source_import_batch_id),
       source_content_hash = values(source_content_hash),
       gtin_valid = values(gtin_valid),
       name = values(name),
       brand_name = values(brand_name),
       name_sort_key = values(name_sort_key),
       brand_sort_key = values(brand_sort_key),
       search_text = values(search_text),
       quantity_text = values(quantity_text),
       serving_size_text = values(serving_size_text),
       serving_quantity_centi_g = values(serving_quantity_centi_g),
       package_quantity_centi_g = values(package_quantity_centi_g),
       energy_kcal_100g = values(energy_kcal_100g),
       energy_kj_100g = values(energy_kj_100g),
       protein_100g_centi_g = values(protein_100g_centi_g),
       fibre_100g_centi_g = values(fibre_100g_centi_g),
       fat_100g_centi_g = values(fat_100g_centi_g),
       saturated_fat_100g_centi_g = values(saturated_fat_100g_centi_g),
       carbs_100g_centi_g = values(carbs_100g_centi_g),
       sugars_100g_centi_g = values(sugars_100g_centi_g),
       salt_100g_mg = values(salt_100g_mg),
       sodium_100g_mg = values(sodium_100g_mg),
       image_url = values(image_url),
       image_small_url = values(image_small_url),
       data_quality_score = values(data_quality_score),
       popularity_score = values(popularity_score),
       source_updated_at_epoch = values(source_updated_at_epoch),
       source_last_seen_at = values(source_last_seen_at),
       source_deleted_at = null`,
    [
      product.publicId,
      SOURCE_KIND,
      product.sourceExternalId,
      batchId,
      product.sourceContentHash,
      product.barcode,
      product.gtinValid,
      product.name,
      product.brandName,
      product.nameSortKey,
      product.brandSortKey,
      product.searchText,
      product.quantityText,
      product.servingSizeText,
      product.servingQuantityCentiG,
      product.packageQuantityCentiG,
      product.energyKcal100g,
      product.energyKj100g,
      product.protein100gCentiG,
      product.fibre100gCentiG,
      product.fat100gCentiG,
      product.saturatedFat100gCentiG,
      product.carbs100gCentiG,
      product.sugars100gCentiG,
      product.salt100gMg,
      product.sodium100gMg,
      product.imageUrl,
      product.imageSmallUrl,
      product.dataQualityScore,
      product.popularityScore,
      product.sourceUpdatedAtEpoch,
      product.sourceLastSeenAt,
    ],
  );
  const result = await conn.execute("select id from food_items where source_kind = ? and source_external_id = ?", [
    SOURCE_KIND,
    product.sourceExternalId,
  ]);
  return Number(valueOf(result.rows[0] ?? {}, "id"));
}

async function upsertDetails(conn: DatabaseConnection, foodItemId: number, row: ProductRow) {
  await conn.execute(
    `insert into food_item_details
      (food_item_id, ingredients_text, category_text, category_tags, label_tags, allergen_tags, trace_tags, stores_text,
       countries_tags, nutriscore_grade, nova_group, ecoscore_grade, source_url)
     values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     on duplicate key update
       ingredients_text = values(ingredients_text),
       category_text = values(category_text),
       category_tags = values(category_tags),
       label_tags = values(label_tags),
       allergen_tags = values(allergen_tags),
       trace_tags = values(trace_tags),
       stores_text = values(stores_text),
       countries_tags = values(countries_tags),
       nutriscore_grade = values(nutriscore_grade),
       nova_group = values(nova_group),
       ecoscore_grade = values(ecoscore_grade),
       source_url = values(source_url)`,
    [
      foodItemId,
      nullableText(row.ingredients_text),
      nullableText(row.categories),
      jsonValue(row.categories_tags),
      jsonValue(row.labels_tags),
      jsonValue(row.allergens_tags),
      jsonValue(row.traces_tags),
      nullableText(row.stores),
      jsonValue(row.countries_tags),
      nullableText(row.nutriscore_grade, 24),
      intValue(row.nova_group),
      nullableText(row.ecoscore_grade, 24),
      nullableText(row.url, 1024),
    ],
  );
}

async function upsertRawSource(conn: DatabaseConnection, foodItemId: number, row: ProductRow) {
  await conn.execute(
    `insert into food_item_raw_sources (food_item_id, source_kind, source_content_hash, raw_source)
     values (?, ?, ?, ?)
     on duplicate key update
       source_kind = values(source_kind),
       source_content_hash = values(source_content_hash),
       raw_source = values(raw_source)`,
    [foodItemId, SOURCE_KIND, nullableText(row.source_content_hash, 64), JSON.stringify(row)],
  );
}

async function upsertMarkets(conn: DatabaseConnection, foodItemId: number, row: ProductRow) {
  const tags = tagList(row.countries_tags);
  const seen = new Set<string>();
  for (const tag of tags) {
    const countryCode = UK_TAG_TO_COUNTRY.get(tag);
    if (!countryCode || seen.has(countryCode)) {
      continue;
    }
    seen.add(countryCode);
    await conn.execute(
      `insert into food_item_markets (food_item_id, country_code, source_tag)
       values (?, ?, ?)
       on duplicate key update source_tag = values(source_tag)`,
      [foodItemId, countryCode, tag],
    );
  }
}

async function upsertServing(
  conn: DatabaseConnection,
  foodItemId: number,
  servingKind: string,
  label: string,
  quantityCentiG: number | null,
  isDefault: boolean,
) {
  if (!quantityCentiG || !label) {
    return;
  }
  await conn.execute(
    `insert into food_item_servings
      (food_item_id, serving_kind, label, quantity_centi_g, unit, serving_count_centi, is_default, source)
     values (?, ?, ?, ?, 'g', null, ?, ?)
     on duplicate key update
       quantity_centi_g = values(quantity_centi_g),
       is_default = values(is_default),
       source = values(source)`,
    [foodItemId, servingKind, label.slice(0, 128), quantityCentiG, isDefault ? 1 : 0, SOURCE_KIND],
  );
}

async function upsertServings(conn: DatabaseConnection, foodItemId: number, row: ProductRow) {
  const servingQuantity = centiG(row.serving_quantity);
  const packageQuantity = centiG(row.product_quantity);
  const hasSourceServing = servingQuantity !== null;
  await upsertServing(
    conn,
    foodItemId,
    "serving",
    nullableText(row.serving_size, 128) ?? `${Math.round((servingQuantity ?? 0) / 100)} g`,
    servingQuantity,
    true,
  );
  await upsertServing(conn, foodItemId, "100g", "100 g", 10_000, !hasSourceServing);
  await upsertServing(
    conn,
    foodItemId,
    "package",
    nullableText(row.quantity, 128) ?? `${Math.round((packageQuantity ?? 0) / 100)} g pack`,
    packageQuantity,
    false,
  );
}

async function upsertAsset(
  conn: DatabaseConnection,
  foodItemId: number,
  assetKind: string,
  url: unknown,
  sourceKey: string | null,
) {
  const cleanUrl = nullableText(url, 1024);
  if (!cleanUrl || !sourceKey) {
    return;
  }
  await conn.execute(
    `insert into food_item_assets (food_item_id, asset_kind, url, source_key)
     values (?, ?, ?, ?)
     on duplicate key update
       food_item_id = values(food_item_id),
       asset_kind = values(asset_kind),
       url = values(url)`,
    [foodItemId, assetKind, cleanUrl, sourceKey],
  );
}

async function upsertAssets(conn: DatabaseConnection, foodItemId: number, row: ProductRow) {
  const sourceKey = text(row.barcode || row.source_code, 191);
  await upsertAsset(conn, foodItemId, "front", row.image_url, `off:${sourceKey}:front`);
  await upsertAsset(conn, foodItemId, "front_small", row.image_small_url, `off:${sourceKey}:front_small`);
  await upsertAsset(conn, foodItemId, "aws_400", row.aws_first_image_400_url, nullableText(row.aws_first_image_400_key, 512));
  await upsertAsset(conn, foodItemId, "ocr_json", row.aws_first_ocr_json_url, nullableText(row.aws_first_ocr_json_key, 512));
}

async function upsertAlias(conn: DatabaseConnection, foodItemId: number, alias: unknown, weight: number) {
  const aliasText = nullableText(alias, 255);
  const aliasKey = nullableText(sortKey(alias), 191);
  if (!aliasText || !aliasKey) {
    return;
  }
  await conn.execute(
    `insert into food_search_aliases (food_item_id, locale, alias, alias_sort_key, weight)
     values (?, ?, ?, ?, ?)
     on duplicate key update
       alias = values(alias),
       weight = values(weight)`,
    [foodItemId, LOCALE, aliasText, aliasKey, weight],
  );
}

async function upsertAliases(conn: DatabaseConnection, foodItemId: number, row: ProductRow) {
  const brandName = cleanFoodBrand(row.brands);
  const categoryName = cleanCategoryName(row.main_category_en ?? row.categories);
  const name = cleanFoodName(row.product_name, { brandName, fallbackName: row.generic_name, categoryName });
  await upsertAlias(conn, foodItemId, name, 12);
  await upsertAlias(conn, foodItemId, row.product_name, 10);
  await upsertAlias(conn, foodItemId, row.generic_name, 6);
  await upsertAlias(conn, foodItemId, brandName, 4);
  await upsertAlias(conn, foodItemId, row.brands, 3);
  await upsertAlias(conn, foodItemId, [brandName, name].filter(Boolean).join(" "), 9);
  await upsertAlias(conn, foodItemId, [row.brands, row.product_name].filter(Boolean).join(" "), 7);
}

async function upsertFoodItemsBatch(conn: DatabaseConnection, records: ImportRecord[], batchId: number) {
  const columns = [
    "public_id",
    "source_kind",
    "source_external_id",
    "source_import_batch_id",
    "source_content_hash",
    "visibility",
    "barcode",
    "gtin_valid",
    "name",
    "brand_name",
    "name_sort_key",
    "brand_sort_key",
    "search_text",
    "quantity_text",
    "serving_size_text",
    "serving_quantity_centi_g",
    "package_quantity_centi_g",
    "energy_kcal_100g",
    "energy_kj_100g",
    "protein_100g_centi_g",
    "fibre_100g_centi_g",
    "fat_100g_centi_g",
    "saturated_fat_100g_centi_g",
    "carbs_100g_centi_g",
    "sugars_100g_centi_g",
    "salt_100g_mg",
    "sodium_100g_mg",
    "image_url",
    "image_small_url",
    "data_quality_score",
    "popularity_score",
    "source_updated_at_epoch",
    "source_last_seen_at",
    "source_deleted_at",
  ];
  const params = records.flatMap(({ product }) => [
    product.publicId,
    SOURCE_KIND,
    product.sourceExternalId,
    batchId,
    product.sourceContentHash,
    "public",
    product.barcode,
    product.gtinValid,
    product.name,
    product.brandName,
    product.nameSortKey,
    product.brandSortKey,
    product.searchText,
    product.quantityText,
    product.servingSizeText,
    product.servingQuantityCentiG,
    product.packageQuantityCentiG,
    product.energyKcal100g,
    product.energyKj100g,
    product.protein100gCentiG,
    product.fibre100gCentiG,
    product.fat100gCentiG,
    product.saturatedFat100gCentiG,
    product.carbs100gCentiG,
    product.sugars100gCentiG,
    product.salt100gMg,
    product.sodium100gMg,
    product.imageUrl,
    product.imageSmallUrl,
    product.dataQualityScore,
    product.popularityScore,
    product.sourceUpdatedAtEpoch,
    product.sourceLastSeenAt,
    null,
  ]);
  await conn.execute(
    `insert into food_items (${columns.join(", ")})
     values ${rowPlaceholders(records.length, columns.length)}
     on duplicate key update
       source_import_batch_id = values(source_import_batch_id),
       source_content_hash = values(source_content_hash),
       gtin_valid = values(gtin_valid),
       name = values(name),
       brand_name = values(brand_name),
       name_sort_key = values(name_sort_key),
       brand_sort_key = values(brand_sort_key),
       search_text = values(search_text),
       quantity_text = values(quantity_text),
       serving_size_text = values(serving_size_text),
       serving_quantity_centi_g = values(serving_quantity_centi_g),
       package_quantity_centi_g = values(package_quantity_centi_g),
       energy_kcal_100g = values(energy_kcal_100g),
       energy_kj_100g = values(energy_kj_100g),
       protein_100g_centi_g = values(protein_100g_centi_g),
       fibre_100g_centi_g = values(fibre_100g_centi_g),
       fat_100g_centi_g = values(fat_100g_centi_g),
       saturated_fat_100g_centi_g = values(saturated_fat_100g_centi_g),
       carbs_100g_centi_g = values(carbs_100g_centi_g),
       sugars_100g_centi_g = values(sugars_100g_centi_g),
       salt_100g_mg = values(salt_100g_mg),
       sodium_100g_mg = values(sodium_100g_mg),
       image_url = values(image_url),
       image_small_url = values(image_small_url),
       data_quality_score = values(data_quality_score),
       popularity_score = values(popularity_score),
       source_updated_at_epoch = values(source_updated_at_epoch),
       source_last_seen_at = values(source_last_seen_at),
       source_deleted_at = null`,
    params,
  );
}

async function foodItemIdsForRecords(conn: DatabaseConnection, records: ImportRecord[]) {
  const externalIds = records.map(({ product }) => product.sourceExternalId);
  return foodItemIdsForExternalIds(conn, externalIds);
}

async function foodItemIdsForExternalIds(conn: DatabaseConnection, externalIds: string[]) {
  if (externalIds.length === 0) {
    return new Map<string, number>();
  }
  const result = await conn.execute(
    `select id, source_external_id from food_items where source_kind = ? and source_external_id in (${externalIds
      .map(() => "?")
      .join(", ")})`,
    [SOURCE_KIND, ...externalIds],
  );
  const ids = new Map<string, number>();
  for (const row of result.rows) {
    ids.set(String(valueOf(row, "source_external_id")), Number(valueOf(row, "id")));
  }
  return ids;
}

async function upsertSourceRefsBatch(conn: DatabaseConnection, records: ImportRecord[], ids: Map<string, number>, batchId: number) {
  const canonicalByExternalId = new Map(records.filter((record) => record.isCanonical).map((record) => [record.product.sourceExternalId, record]));
  const rows: unknown[][] = [];

  for (const { product, canonicalSourceExternalId, duplicateGroupKey, isCanonical, duplicateReason } of records) {
    const foodItemId = ids.get(canonicalSourceExternalId);
    const canonical = canonicalByExternalId.get(canonicalSourceExternalId);
    if (!foodItemId || !canonical) {
      continue;
    }

    rows.push([
      foodItemId,
      SOURCE_KIND,
      product.sourceExternalId,
      product.barcode,
      batchId,
      canonicalSourceExternalId,
      canonical.product.barcode,
      duplicateGroupKey.slice(0, 191),
      duplicateReason,
      isCanonical ? 1 : 0,
      product.sourceContentHash,
    ]);
  }

  await executeBulk(
    conn,
    "food_item_source_refs",
    [
      "food_item_id",
      "source_kind",
      "source_external_id",
      "barcode",
      "source_import_batch_id",
      "canonical_source_external_id",
      "canonical_barcode",
      "duplicate_group_key",
      "duplicate_reason",
      "is_canonical",
      "source_content_hash",
    ],
    rows,
    `on duplicate key update
       food_item_id = values(food_item_id),
       source_import_batch_id = values(source_import_batch_id),
       canonical_source_external_id = values(canonical_source_external_id),
       canonical_barcode = values(canonical_barcode),
       duplicate_group_key = values(duplicate_group_key),
       duplicate_reason = values(duplicate_reason),
       is_canonical = values(is_canonical),
       source_content_hash = values(source_content_hash)`,
  );
}

async function markDuplicateFoodItemsBatch(conn: DatabaseConnection, records: ImportRecord[]) {
  const duplicateExternalIds = records
    .filter((record) => !record.isCanonical)
    .map((record) => record.product.sourceExternalId);

  for (const chunk of chunked(duplicateExternalIds, 100)) {
    await conn.execute(
      `update food_items
       set source_deleted_at = ?
       where source_kind = ? and source_external_id in (${chunk.map(() => "?").join(", ")})`,
      [mysqlDatetime(new Date()), SOURCE_KIND, ...chunk],
    );
  }
}

function sourceRefRecord(row: ProductRow): SourceRefRecord | null {
  const sourceExternalId = text(row.source_code, 191);
  const barcode = nullableText(row.barcode, 14);
  const canonicalSourceExternalId = text(row.canonical_source_code, 191);
  const canonicalBarcode = nullableText(row.canonical_barcode, 14);

  if (!sourceExternalId || !canonicalSourceExternalId) {
    return null;
  }

  return {
    sourceExternalId,
    barcode,
    canonicalSourceExternalId,
    canonicalBarcode,
    duplicateGroupKey: text(row.canonical_group_key, 191),
    isCanonical: text(row.is_canonical) === "1" || row.is_canonical === 1 || row.is_canonical === true,
    duplicateReason: nullableText(row.duplicate_reason, 64),
    sourceContentHash: nullableText(row.source_content_hash, 64),
  };
}

async function upsertSourceRefRowsBatch(conn: DatabaseConnection, records: SourceRefRecord[], batchId: number) {
  const ids = await foodItemIdsForExternalIds(conn, [...new Set(records.map((record) => record.canonicalSourceExternalId))]);
  const rows: unknown[][] = [];

  for (const record of records) {
    const foodItemId = ids.get(record.canonicalSourceExternalId);
    if (!foodItemId) {
      continue;
    }
    rows.push([
      foodItemId,
      SOURCE_KIND,
      record.sourceExternalId,
      record.barcode,
      batchId,
      record.canonicalSourceExternalId,
      record.canonicalBarcode,
      record.duplicateGroupKey,
      record.duplicateReason,
      record.isCanonical ? 1 : 0,
      record.sourceContentHash,
    ]);
  }

  await executeBulk(
    conn,
    "food_item_source_refs",
    [
      "food_item_id",
      "source_kind",
      "source_external_id",
      "barcode",
      "source_import_batch_id",
      "canonical_source_external_id",
      "canonical_barcode",
      "duplicate_group_key",
      "duplicate_reason",
      "is_canonical",
      "source_content_hash",
    ],
    rows,
    `on duplicate key update
       food_item_id = values(food_item_id),
       source_import_batch_id = values(source_import_batch_id),
       canonical_source_external_id = values(canonical_source_external_id),
       canonical_barcode = values(canonical_barcode),
       duplicate_group_key = values(duplicate_group_key),
       duplicate_reason = values(duplicate_reason),
       is_canonical = values(is_canonical),
       source_content_hash = values(source_content_hash)`,
  );
  return rows.length;
}

async function markDuplicateSourceRefRowsBatch(conn: DatabaseConnection, records: SourceRefRecord[]) {
  const duplicateExternalIds = records
    .filter((record) => !record.isCanonical)
    .map((record) => record.sourceExternalId);

  for (const chunk of chunked(duplicateExternalIds, 100)) {
    await conn.execute(
      `update food_items
       set source_deleted_at = ?
       where source_kind = ? and source_external_id in (${chunk.map(() => "?").join(", ")})`,
      [mysqlDatetime(new Date()), SOURCE_KIND, ...chunk],
    );
  }
}

async function executeBulk(
  conn: DatabaseConnection,
  table: string,
  columns: string[],
  rows: unknown[][],
  onDuplicate: string,
) {
  if (rows.length === 0) {
    return;
  }
  await conn.execute(
    `insert into ${table} (${columns.join(", ")}) values ${rowPlaceholders(rows.length, columns.length)} ${onDuplicate}`,
    rows.flat(),
  );
}

async function upsertDetailsBatch(conn: DatabaseConnection, records: ImportRecord[], ids: Map<string, number>) {
  const columns = [
    "food_item_id",
    "ingredients_text",
    "category_text",
    "category_tags",
    "label_tags",
    "allergen_tags",
    "trace_tags",
    "stores_text",
    "countries_tags",
    "nutriscore_grade",
    "nova_group",
    "ecoscore_grade",
    "source_url",
  ];
  const rows: unknown[][] = [];
  for (const { row, canonicalSourceExternalId } of records) {
    const foodItemId = ids.get(canonicalSourceExternalId);
    if (!foodItemId) {
      continue;
    }
    rows.push([
      foodItemId,
      nullableText(row.ingredients_text),
      nullableText(row.categories),
      jsonValue(row.categories_tags),
      jsonValue(row.labels_tags),
      jsonValue(row.allergens_tags),
      jsonValue(row.traces_tags),
      nullableText(row.stores),
      jsonValue(row.countries_tags),
      nullableText(row.nutriscore_grade, 24),
      intValue(row.nova_group),
      nullableText(row.ecoscore_grade, 24),
      nullableText(row.url, 1024),
    ]);
  }
  await executeBulk(
    conn,
    "food_item_details",
    columns,
    rows,
    `on duplicate key update
       ingredients_text = values(ingredients_text),
       category_text = values(category_text),
       category_tags = values(category_tags),
       label_tags = values(label_tags),
       allergen_tags = values(allergen_tags),
       trace_tags = values(trace_tags),
       stores_text = values(stores_text),
       countries_tags = values(countries_tags),
       nutriscore_grade = values(nutriscore_grade),
       nova_group = values(nova_group),
       ecoscore_grade = values(ecoscore_grade),
       source_url = values(source_url)`,
  );
}

async function upsertRawSourcesBatch(conn: DatabaseConnection, records: ImportRecord[], ids: Map<string, number>) {
  const rows: unknown[][] = [];
  for (const { row, canonicalSourceExternalId } of records) {
    const foodItemId = ids.get(canonicalSourceExternalId);
    if (!foodItemId) {
      continue;
    }
    rows.push([foodItemId, SOURCE_KIND, nullableText(row.source_content_hash, 64), JSON.stringify(row)]);
  }
  await executeBulk(
    conn,
    "food_item_raw_sources",
    ["food_item_id", "source_kind", "source_content_hash", "raw_source"],
    rows,
    `on duplicate key update
       source_kind = values(source_kind),
       source_content_hash = values(source_content_hash),
       raw_source = values(raw_source)`,
  );
}

async function upsertMarketsBatch(conn: DatabaseConnection, records: ImportRecord[], ids: Map<string, number>) {
  const rows: unknown[][] = [];
  for (const { row, canonicalSourceExternalId } of records) {
    const foodItemId = ids.get(canonicalSourceExternalId);
    if (!foodItemId) {
      continue;
    }
    const seen = new Set<string>();
    for (const tag of tagList(row.countries_tags)) {
      const countryCode = UK_TAG_TO_COUNTRY.get(tag);
      if (!countryCode || seen.has(countryCode)) {
        continue;
      }
      seen.add(countryCode);
      rows.push([foodItemId, countryCode, tag]);
    }
  }
  await executeBulk(
    conn,
    "food_item_markets",
    ["food_item_id", "country_code", "source_tag"],
    rows,
    "on duplicate key update source_tag = values(source_tag)",
  );
}

function servingRowsForRecord(foodItemId: number, row: ProductRow) {
  const rows: unknown[][] = [];
  const servingQuantity = centiG(row.serving_quantity);
  const packageQuantity = centiG(row.product_quantity);
  const hasSourceServing = servingQuantity !== null;
  if (servingQuantity) {
    rows.push([
      foodItemId,
      "serving",
      (nullableText(row.serving_size, 128) ?? `${Math.round(servingQuantity / 100)} g`).slice(0, 128),
      servingQuantity,
      "g",
      null,
      1,
      SOURCE_KIND,
    ]);
  }
  rows.push([foodItemId, "100g", "100 g", 10_000, "g", null, hasSourceServing ? 0 : 1, SOURCE_KIND]);
  if (packageQuantity) {
    rows.push([
      foodItemId,
      "package",
      (nullableText(row.quantity, 128) ?? `${Math.round(packageQuantity / 100)} g pack`).slice(0, 128),
      packageQuantity,
      "g",
      null,
      0,
      SOURCE_KIND,
    ]);
  }
  return rows;
}

async function upsertServingsBatch(conn: DatabaseConnection, records: ImportRecord[], ids: Map<string, number>) {
  const rows = records.flatMap(({ row, canonicalSourceExternalId }) => {
    const foodItemId = ids.get(canonicalSourceExternalId);
    return foodItemId ? servingRowsForRecord(foodItemId, row) : [];
  });
  await executeBulk(
    conn,
    "food_item_servings",
    ["food_item_id", "serving_kind", "label", "quantity_centi_g", "unit", "serving_count_centi", "is_default", "source"],
    rows,
    `on duplicate key update
       quantity_centi_g = values(quantity_centi_g),
       is_default = values(is_default),
       source = values(source)`,
  );
}

async function upsertAssetsBatch(conn: DatabaseConnection, records: ImportRecord[], ids: Map<string, number>) {
  const rows: unknown[][] = [];
  for (const { row, canonicalSourceExternalId } of records) {
    const foodItemId = ids.get(canonicalSourceExternalId);
    if (!foodItemId) {
      continue;
    }
    const sourceKey = text(row.barcode || row.source_code, 191);
    const assets = [
      ["front", row.image_url, `off:${sourceKey}:front`],
      ["front_small", row.image_small_url, `off:${sourceKey}:front_small`],
      ["aws_400", row.aws_first_image_400_url, nullableText(row.aws_first_image_400_key, 512)],
      ["ocr_json", row.aws_first_ocr_json_url, nullableText(row.aws_first_ocr_json_key, 512)],
    ] as const;
    for (const [assetKind, url, sourceKey] of assets) {
      const cleanUrl = nullableText(url, 1024);
      if (cleanUrl && sourceKey) {
        rows.push([foodItemId, assetKind, cleanUrl, sourceKey]);
      }
    }
  }
  await executeBulk(
    conn,
    "food_item_assets",
    ["food_item_id", "asset_kind", "url", "source_key"],
    rows,
    `on duplicate key update
       food_item_id = values(food_item_id),
       asset_kind = values(asset_kind),
       url = values(url)`,
  );
}

async function upsertAliasesBatch(conn: DatabaseConnection, records: ImportRecord[], ids: Map<string, number>) {
  const byKey = new Map<string, unknown[]>();
  for (const { row, product, canonicalSourceExternalId } of records) {
    const foodItemId = ids.get(canonicalSourceExternalId);
    if (!foodItemId) {
      continue;
    }
    const aliases: Array<[unknown, number]> = [
      [product.name, 12],
      [row.product_name, 10],
      [row.generic_name, 6],
      [product.brandName, 4],
      [row.brands, 3],
      [[product.brandName, product.name].filter(Boolean).join(" "), 9],
      [[row.brands, row.product_name].filter(Boolean).join(" "), 7],
    ];
    for (const [alias, weight] of aliases) {
      const aliasText = nullableText(alias, 255);
      const aliasKey = nullableText(sortKey(alias), 191);
      if (!aliasText || !aliasKey) {
        continue;
      }
      byKey.set(`${foodItemId}:${LOCALE}:${aliasKey}`, [foodItemId, LOCALE, aliasText, aliasKey, weight]);
    }
  }
  await executeBulk(
    conn,
    "food_search_aliases",
    ["food_item_id", "locale", "alias", "alias_sort_key", "weight"],
    [...byKey.values()],
    `on duplicate key update
       alias = values(alias),
       weight = values(weight)`,
  );
}

async function importBatch(conn: DatabaseConnection, records: ImportRecord[], batchId: number) {
  const canonicalRecords = records.filter((record) => record.isCanonical);
  await upsertFoodItemsBatch(conn, canonicalRecords, batchId);
  const ids = await foodItemIdsForRecords(conn, canonicalRecords);
  await upsertSourceRefsBatch(conn, records, ids, batchId);
  await markDuplicateFoodItemsBatch(conn, records);
  await upsertDetailsBatch(conn, canonicalRecords, ids);
  await upsertRawSourcesBatch(conn, canonicalRecords, ids);
  await upsertMarketsBatch(conn, records, ids);
  await upsertServingsBatch(conn, records, ids);
  await upsertAssetsBatch(conn, records, ids);
  await upsertAliasesBatch(conn, records, ids);
}

async function importSourceRefs(conn: DatabaseConnection, input: string, batchId: number, batchSize: number) {
  if (!existsSync(input)) {
    return { seen: 0, imported: 0, skipped: 0 };
  }

  const reader = createInterface({ input: createReadStream(input), crlfDelay: Infinity });
  let seen = 0;
  let imported = 0;
  let skipped = 0;
  const pending: SourceRefRecord[] = [];

  for await (const line of reader) {
    if (!line.trim()) {
      continue;
    }
    seen += 1;
    const record = sourceRefRecord(JSON.parse(line) as ProductRow);
    if (!record) {
      skipped += 1;
      continue;
    }
    pending.push(record);
    if (pending.length >= batchSize) {
      imported += await upsertSourceRefRowsBatch(conn, pending, batchId);
      await markDuplicateSourceRefRowsBatch(conn, pending);
      pending.length = 0;
    }
  }

  if (pending.length > 0) {
    imported += await upsertSourceRefRowsBatch(conn, pending, batchId);
    await markDuplicateSourceRefRowsBatch(conn, pending);
  }

  return { seen, imported, skipped };
}

async function importRows() {
  const input = resolve(PROJECT_ROOT, argValue("--input", DEFAULT_INPUT));
  const sourceRefsInput = resolve(PROJECT_ROOT, argValue("--source-refs-input", DEFAULT_SOURCE_REFS_INPUT));
  const limit = flagNumber("--limit", 100);
  const batchSize = Math.max(1, flagNumber("--batch-size", 100));
  const progressInterval = Math.max(batchSize, flagNumber("--progress-interval", 1000));
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required.");
  }

  const conn = connect({ url: databaseUrl });
  const batchId = await insertImportBatch(conn, input, limit);
  const reader = createInterface({ input: createReadStream(input), crlfDelay: Infinity });

  let seen = 0;
  let imported = 0;
  let sourceRefs = 0;
  let skipped = 0;
  const pending: PendingImportRecord[] = [];
  for await (const line of reader) {
    if (!line.trim()) {
      continue;
    }
    if (limit > 0 && seen >= limit) {
      break;
    }
    seen += 1;
    const row = JSON.parse(line) as ProductRow;
    const product = sanitizedProduct(row);
    if (!product) {
      skipped += 1;
      continue;
    }
    pending.push({ row, product });
  }

  const groups = canonicalGroups(pending);
  for (const groupChunk of groupChunks(groups, batchSize)) {
    const records = groupChunk.flatMap((group) => group.records);
    await importBatch(conn, records, batchId);
    imported += groupChunk.length;
    sourceRefs += records.length;
    if (sourceRefs % progressInterval === 0) {
      console.error(
        `imported ${imported.toLocaleString()} canonical rows and ${sourceRefs.toLocaleString()} source refs`,
      );
    }
  }
  if (imported % progressInterval !== 0) {
    console.error(`imported ${imported.toLocaleString()} canonical rows and ${sourceRefs.toLocaleString()} source refs`);
  }

  const externalSourceRefs =
    limit === 0 && sourceRefsInput !== input
      ? await importSourceRefs(conn, sourceRefsInput, batchId, batchSize)
      : { seen: 0, imported: 0, skipped: 0 };
  if (externalSourceRefs.imported > 0) {
    sourceRefs = externalSourceRefs.imported;
    console.error(`imported ${sourceRefs.toLocaleString()} source refs from ${sourceRefsInput}`);
  }

  await conn.execute(
    `update food_import_batches
     set product_rows_seen = ?, uk_rows_seen = ?, output_product_count = ?
     where id = ?`,
    [seen, seen, imported, batchId],
  );

  const sample = await conn.execute(
    `select
       fi.id, fi.barcode, fi.name, fi.brand_name, fi.energy_kcal_100g,
       fi.protein_100g_centi_g, fi.fibre_100g_centi_g, fi.fat_100g_centi_g,
       fi.serving_size_text, fi.data_quality_score, fi.popularity_score
     from food_items fi
     where fi.source_import_batch_id = ?
     order by fi.id
     limit 5`,
    [batchId],
  );

  console.log(
    JSON.stringify(
      {
        batchId,
        seen,
        imported,
        sourceRefs,
        duplicates: sourceRefs - imported,
        skipped,
        sample: sample.rows,
      },
      null,
      2,
    ),
  );
}

await importRows();
