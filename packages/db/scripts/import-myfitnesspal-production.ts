import { connect } from "@planetscale/database";
import { createHash } from "node:crypto";
import { createReadStream, createWriteStream, existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import { cleanCategoryName, cleanFoodBrand, cleanFoodName, foodDedupeKey, foodTextKey } from "@pippa/domain/food-display";

type CsvRow = Record<string, string>;
type DatabaseConnection = ReturnType<typeof connect>;

type ImportOptions = {
  apply: boolean;
  input: string;
  outputDir: string;
  country: string;
  limit: number;
  batchSize: number;
  progressInterval: number;
  minQuality: number;
  allowWarnings: boolean;
};

type CuratedProduct = {
  sourceExternalId: string;
  publicId: string;
  sourceContentHash: string;
  duplicateGroupKey: string;
  sourceIds: Set<string>;
  sourceRefRows: SourceRefRow[];
  raw: CsvRow;
  name: string;
  brandName: string | null;
  categoryName: string | null;
  countryCode: string | null;
  nameSortKey: string;
  brandSortKey: string | null;
  searchText: string;
  servingSizeText: string;
  servingQuantityCentiG: number;
  energyKcal100g: number;
  protein100gCentiG: number;
  fibre100gCentiG: number | null;
  fat100gCentiG: number;
  saturatedFat100gCentiG: number | null;
  carbs100gCentiG: number;
  sugars100gCentiG: number | null;
  sodium100gMg: number | null;
  salt100gMg: number | null;
  dataQualityScore: number;
  popularityScore: number;
  aliases: AliasRow[];
};

type Candidate = {
  product: CuratedProduct;
  score: number;
};

type SourceRefRow = {
  sourceExternalId: string;
  barcode: string | null;
  canonicalSourceExternalId: string;
  canonicalBarcode: string | null;
  duplicateGroupKey: string;
  duplicateReason: string | null;
  isCanonical: boolean;
  sourceContentHash: string | null;
};

type AliasRow = {
  sourceExternalId: string;
  locale: string;
  alias: string;
  aliasSortKey: string;
  weight: number;
};

type RejectedRow = {
  sourceId: string;
  productName: string;
  brandName: string;
  countryCode: string;
  qualityScore: string;
  qualityWarnings: string;
  reasons: string[];
};

type ImportSummary = {
  generated_at: string;
  mode: "dry-run" | "apply";
  input: string;
  output_dir: string;
  seen_rows: number;
  candidate_rows: number;
  promoted_products: number;
  source_refs: number;
  aliases: number;
  rejected_rows: number;
  duplicate_groups_collapsed: number;
  options: {
    country: string;
    min_quality: number;
    allow_warnings: boolean;
    limit: number;
  };
  rejection_reasons: Record<string, number>;
  benchmark_queries: BenchmarkResult[];
  database?: {
    batch_id: number;
    products_imported: number;
    source_refs_imported: number;
    aliases_imported: number;
  };
};

type BenchmarkResult = {
  query: string;
  duration_ms: number;
  result_count: number;
  top_results: Array<{
    name: string;
    brand: string | null;
    score: number;
  }>;
};

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(SCRIPT_DIR, "../../..");
const DEFAULT_INPUT = resolve(PROJECT_ROOT, "data/myfitnesspal/combined-corpus/products.csv");
const DEFAULT_OUTPUT_DIR = resolve(PROJECT_ROOT, "data/myfitnesspal/production-corpus");
const SOURCE_KIND = "myfitnesspal";
const LOCALE = "en-GB";
const MASS_UNIT_TO_GRAMS = new Map([
  ["g", 1],
  ["gr", 1],
  ["gram", 1],
  ["grams", 1],
  ["gramm", 1],
  ["gramme", 1],
  ["grammes", 1],
  ["grama", 1],
  ["gramas", 1],
  ["grammo", 1],
  ["gramos", 1],
  ["kg", 1000],
  ["kilogram", 1000],
  ["kilograms", 1000],
  ["oz", 28.3495],
  ["ounce", 28.3495],
  ["ounces", 28.3495],
  ["lb", 453.592],
  ["lbs", 453.592],
  ["pound", 453.592],
  ["pounds", 453.592],
]);
const HARD_BLOCK_TOKENS = new Set([
  "anal",
  "arse",
  "bastard",
  "bitch",
  "bollocks",
  "boner",
  "boob",
  "boobs",
  "bullshit",
  "butthole",
  "cock",
  "crap",
  "cunt",
  "dick",
  "dong",
  "dongus",
  "fag",
  "fuck",
  "fucked",
  "fucker",
  "fucking",
  "gey",
  "gobshite",
  "horny",
  "meme",
  "milf",
  "nazi",
  "obesity",
  "penis",
  "poop",
  "piss",
  "porn",
  "rapist",
  "sexy",
  "shit",
  "slut",
  "test",
  "thicc",
  "tits",
  "vagina",
  "wank",
]);
const HARD_BLOCK_TOKEN_PREFIXES = ["bullshit", "fuck", "dongus", "thicc", "porn"];
const HARD_BLOCK_PHRASES = [
  "bob ross",
  "breastfeeding",
  "cleanse",
  "detox",
  "dummy",
  "fake food",
  "he need some milk",
  "right click",
  "skin of",
  "you mom",
  "ye mum",
  "<h1",
  "<script",
  "javascript",
];
const SYNONYM_GROUPS = [
  ["yoghurt", "yogurt"],
  ["fibre", "fiber"],
  ["aubergine", "eggplant"],
  ["courgette", "zucchini"],
  ["coriander", "cilantro"],
  ["rocket", "arugula"],
  ["prawns", "shrimp"],
  ["porridge", "oatmeal"],
  ["crisps", "chips"],
  ["chips", "fries"],
  ["veg", "vegetables"],
  ["veggie", "vegetable"],
  ["mince", "ground beef"],
  ["skimmed", "skim"],
  ["semi skimmed", "reduced fat"],
  ["wholemeal", "whole wheat"],
] as const;
const BRAND_ALIASES = new Map([
  ["m s", ["M&S", "Marks and Spencer", "Marks & Spencer"]],
  ["marks and spencer", ["M&S", "Marks and Spencer", "Marks & Spencer"]],
  ["sainsbury s", ["Sainsbury's", "Sainsburys"]],
  ["co op", ["Co-op", "Coop", "The Co-operative"]],
  ["mcdonalds", ["McDonald's", "Mcdonalds"]],
  ["jd wetherspoon", ["JD Wetherspoon", "Wetherspoons", "J D Wetherspoon"]],
  ["j d wetherspoon", ["JD Wetherspoon", "Wetherspoons", "J D Wetherspoon"]],
]);
const RETAILER_PREFIXES: Array<[string, string]> = [
  ["tesco", "Tesco"],
  ["asda", "Asda"],
  ["sainsbury s", "Sainsbury's"],
  ["sainsburys", "Sainsbury's"],
  ["morrisons", "Morrisons"],
  ["waitrose", "Waitrose"],
  ["aldi", "Aldi"],
  ["lidl", "Lidl"],
  ["m s", "M&S"],
  ["marks and spencer", "M&S"],
  ["co op", "Co-op"],
  ["coop", "Co-op"],
  ["nandos", "Nandos"],
  ["wetherspoons", "JD Wetherspoon"],
  ["jd wetherspoon", "JD Wetherspoon"],
];
const GENERIC_BRAND_KEYS = new Set([
  "bar",
  "bread",
  "burger",
  "cheese",
  "chicken",
  "coffee",
  "crisps",
  "dessert",
  "drink",
  "food",
  "fruit",
  "generic",
  "meal",
  "milk",
  "pasta",
  "pizza",
  "protein",
  "rice",
  "salad",
  "sandwich",
  "soup",
  "wrap",
  "yoghurt",
]);
const PRODUCT_COLUMNS = [
  "source_external_id",
  "public_id",
  "duplicate_group_key",
  "name",
  "brand_name",
  "category_name",
  "country_code",
  "name_sort_key",
  "brand_sort_key",
  "search_text",
  "serving_size_text",
  "serving_quantity_centi_g",
  "energy_kcal_100g",
  "protein_100g_centi_g",
  "fibre_100g_centi_g",
  "fat_100g_centi_g",
  "saturated_fat_100g_centi_g",
  "carbs_100g_centi_g",
  "sugars_100g_centi_g",
  "sodium_100g_mg",
  "salt_100g_mg",
  "data_quality_score",
  "popularity_score",
  "source_ref_count",
] as const;
const SOURCE_REF_COLUMNS = [
  "source_external_id",
  "canonical_source_external_id",
  "barcode",
  "canonical_barcode",
  "duplicate_group_key",
  "duplicate_reason",
  "is_canonical",
  "source_content_hash",
] as const;
const ALIAS_COLUMNS = ["source_external_id", "locale", "alias", "alias_sort_key", "weight"] as const;
const REJECTED_COLUMNS = [
  "source_id",
  "product_name",
  "brand_name",
  "country_code",
  "quality_score",
  "quality_warnings",
  "reasons",
] as const;
const BENCHMARK_QUERIES = [
  "tesco chicken",
  "m&s salad",
  "greek yoghurt",
  "protein bar",
  "nandos chicken",
  "wetherspoons wrap",
  "porridge oats",
  "chicken breast",
  "wholemeal bread",
  "cottage cheese",
] as const;
const USAGE = `Usage:
  bun --filter @pippa/db import:myfitnesspal [--apply]

Options:
  --apply                 Write curated rows to PlanetScale. Default is dry-run only.
  --input <path>          Combined MyFitnessPal products CSV. Default: ${DEFAULT_INPUT}
  --output-dir <path>     Curated output directory. Default: ${DEFAULT_OUTPUT_DIR}
  --country <code|all>    Country filter. Default: GB
  --min-quality <number>  Minimum upstream quality score. Default: 45
  --allow-warnings        Allow upstream quality warnings. Default: reject warnings.
  --limit <number>        Limit scanned rows. 0 means all rows. Default: 0
  --batch-size <number>   PlanetScale insert batch size. Default: 250
`;

loadEnv({ path: resolve(PROJECT_ROOT, ".env") });
loadEnv({ path: resolve(PROJECT_ROOT, "apps/web/.env.local"), override: false });

function argValue(name: string, fallback: string): string {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : (process.argv[index + 1] ?? fallback);
}

function flagNumber(name: string, fallback: number): number {
  const value = Number(argValue(name, String(fallback)));
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(name);
}

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const nextCharacter = line[index + 1];

    if (character === "\"") {
      if (inQuotes && nextCharacter === "\"") {
        current += "\"";
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (character === "," && !inQuotes) {
      values.push(current);
      current = "";
      continue;
    }

    current += character;
  }

  values.push(current);
  return values;
}

function toCsvRow(headers: string[], values: string[]): CsvRow {
  const row: CsvRow = {};
  for (let index = 0; index < headers.length; index += 1) {
    row[headers[index] ?? `column_${index}`] = values[index] ?? "";
  }
  return row;
}

function csvEscape(value: unknown): string {
  const stringValue = String(value ?? "");
  if (!/[",\n\r]/.test(stringValue)) {
    return stringValue;
  }
  return `"${stringValue.replaceAll("\"", "\"\"")}"`;
}

function csvLine(columns: readonly string[], row: Record<string, unknown>): string {
  return columns.map((column) => csvEscape(row[column])).join(",");
}

function text(value: unknown, maxLength?: number): string {
  const cleaned = String(value ?? "")
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return maxLength === undefined ? cleaned : cleaned.slice(0, maxLength);
}

function nullableText(value: unknown, maxLength?: number): string | null {
  const cleaned = text(value, maxLength);
  return cleaned ? cleaned : null;
}

function numberValue(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function intValue(value: unknown): number | null {
  const parsed = numberValue(value);
  return parsed === null ? null : Math.round(parsed);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function hash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function hashRow(row: CsvRow): string {
  return hash(JSON.stringify(row));
}

function publicId(sourceExternalId: string): string {
  return `food_${hash(`${SOURCE_KIND}:${sourceExternalId}`).slice(0, 24)}`;
}

function validGtin(value: string): boolean {
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

function cleanBarcode(value: unknown): string | null {
  const digits = text(value).replace(/\D/g, "");
  return validGtin(digits) ? digits : null;
}

function pipeValues(value: string | undefined): string[] {
  return (value ?? "")
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean);
}

function massServingGrams(row: CsvRow): number | null {
  const unit = foodTextKey(row.default_serving_unit).replace(/\s+/g, " ");
  const multiplier = MASS_UNIT_TO_GRAMS.get(unit);
  const value = numberValue(row.default_serving_value);
  if (!multiplier || value === null || value <= 0) {
    return null;
  }
  const grams = value * multiplier;
  return grams > 0 && grams <= 5000 ? grams : null;
}

function per100(value: unknown, grams: number): number | null {
  const parsed = numberValue(value);
  if (parsed === null) {
    return null;
  }
  return parsed * (100 / grams);
}

function centiGPer100(value: unknown, grams: number): number | null {
  const parsed = per100(value, grams);
  if (parsed === null || parsed < 0 || parsed > 100) {
    return null;
  }
  return Math.round(parsed * 100);
}

function sodiumMgPer100(value: unknown, grams: number): number | null {
  const parsed = per100(value, grams);
  if (parsed === null || parsed < 0 || parsed > 100_000) {
    return null;
  }
  return Math.round(parsed);
}

function kcalPer100(value: unknown, grams: number): number | null {
  const parsed = per100(value, grams);
  if (parsed === null || parsed < 0 || parsed > 1000) {
    return null;
  }
  return Math.round(parsed);
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

function formatServing(row: CsvRow, grams: number): string {
  const value = numberValue(row.default_serving_value);
  const unit = text(row.default_serving_unit, 32);
  if (value !== null && unit) {
    return `${formatNumber(value)} ${unit}`;
  }
  return `${formatNumber(grams)} g`;
}

function rejectionReasonCounts(rejected: RejectedRow[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const row of rejected) {
    for (const reason of row.reasons) {
      counts[reason] = (counts[reason] ?? 0) + 1;
    }
  }
  return Object.fromEntries(Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])));
}

function isMostlyNumeric(key: string): boolean {
  const compact = key.replace(/\s+/g, "");
  if (!compact) {
    return true;
  }
  const digits = compact.replace(/[^0-9]/g, "").length;
  const letters = compact.replace(/[^a-z]/g, "").length;
  return letters < 2 || digits / compact.length > 0.7;
}

function textQualityReasons(name: string, brandName: string | null, raw: CsvRow): string[] {
  const reasons: string[] = [];
  const joined = [name, brandName, raw.product_name, raw.brand_name].filter(Boolean).join(" ");
  const key = foodTextKey(joined);
  const tokens = key.split(" ").filter(Boolean);
  if (isMostlyNumeric(foodTextKey(name))) {
    reasons.push("name_has_too_little_text");
  }
  if (/[<>]/.test(joined)) {
    reasons.push("html_or_markup");
  }
  if (/(.)\1{5,}/i.test(key) || /[bcdfghjklmnpqrstvwxyz]{7,}/i.test(key)) {
    reasons.push("keyboard_smash");
  }
  if (
    tokens.some((token) => HARD_BLOCK_TOKENS.has(token) || HARD_BLOCK_TOKEN_PREFIXES.some((prefix) => token.startsWith(prefix)))
  ) {
    reasons.push("blocked_word");
  }
  if (HARD_BLOCK_PHRASES.some((phrase) => key.includes(foodTextKey(phrase)))) {
    reasons.push("blocked_phrase");
  }
  if (tokens.length === 1 && tokens[0] && tokens[0].length <= 2) {
    reasons.push("name_too_short");
  }
  return reasons;
}

function inferredBrandName(rawBrandName: string, rawProductName: string): string | null {
  const cleanedBrand = cleanFoodBrand(rawBrandName) ?? nullableText(rawBrandName, 191);
  const brandKey = foodTextKey(cleanedBrand);
  const productKey = foodTextKey(rawProductName);
  if (cleanedBrand && !GENERIC_BRAND_KEYS.has(brandKey)) {
    return cleanedBrand;
  }
  const prefix = RETAILER_PREFIXES.find(([key]) => productKey === key || productKey.startsWith(`${key} `));
  return prefix?.[1] ?? cleanedBrand;
}

function nutritionReasons(row: CsvRow, grams: number): string[] {
  const reasons: string[] = [];
  const kcal = kcalPer100(row.calories, grams);
  const protein = centiGPer100(row.protein_g, grams);
  const fat = centiGPer100(row.fat_g, grams);
  const saturatedFat = centiGPer100(row.saturated_fat_g, grams);
  const carbs = centiGPer100(row.carbohydrates_g, grams);
  const sugars = centiGPer100(row.sugar_g, grams);
  const fibre = centiGPer100(row.fiber_g, grams);

  if (kcal === null) reasons.push("invalid_calories_per_100g");
  if (protein === null) reasons.push("invalid_protein_per_100g");
  if (fat === null) reasons.push("invalid_fat_per_100g");
  if (carbs === null) reasons.push("invalid_carbs_per_100g");
  if (
    protein !== null &&
    fat !== null &&
    carbs !== null &&
    protein + fat + carbs + (fibre ?? 0) > 12_500
  ) {
    reasons.push("macro_sum_implausible_per_100g");
  }
  if (fat !== null && saturatedFat !== null && saturatedFat > fat + 50) {
    reasons.push("saturated_fat_exceeds_fat");
  }
  if (carbs !== null && sugars !== null && sugars > carbs + 50) {
    reasons.push("sugar_exceeds_carbs");
  }
  return reasons;
}

function sourceIdsForRow(row: CsvRow): string[] {
  return [
    row.source_id,
    row.canonical_source_id,
    ...pipeValues(row.duplicate_source_ids),
  ]
    .map((value) => text(value, 191))
    .filter(Boolean);
}

function sourceRefCount(row: CsvRow): number {
  return Math.max(1, intValue(row.source_ref_count) ?? sourceIdsForRow(row).length);
}

function discoveredQueryCount(row: CsvRow): number {
  return new Set(pipeValues(row.discovered_by_queries)).size;
}

function candidateScore(row: CsvRow, product: Omit<CuratedProduct, "aliases" | "searchText" | "sourceRefRows" | "sourceIds">): number {
  let score = product.dataQualityScore * 10;
  score += row.verified === "1" ? 120 : 0;
  score += product.countryCode === "GB" ? 80 : 0;
  score += product.brandName ? 35 : 0;
  score += sourceRefCount(row) * 8;
  score += discoveredQueryCount(row) * 2;
  score -= product.name.length * 0.05;
  return score;
}

function popularityScore(row: CsvRow): number {
  const score = sourceRefCount(row) * 25 + discoveredQueryCount(row) * 3 + (row.verified === "1" ? 50 : 0);
  return clamp(score, 0, 2_147_483_647);
}

function synonymAliases(value: string): string[] {
  const key = foodTextKey(value);
  const aliases = new Set<string>();
  for (const group of SYNONYM_GROUPS) {
    for (const term of group) {
      const termKey = foodTextKey(term);
      if (!key.includes(termKey)) {
        continue;
      }
      for (const replacement of group) {
        const replacementKey = foodTextKey(replacement);
        if (replacementKey !== termKey) {
          aliases.add(key.replace(new RegExp(`\\b${termKey}\\b`, "g"), replacementKey));
        }
      }
    }
  }
  return [...aliases].map((alias) => cleanFoodName(alias));
}

function brandAliases(brandName: string | null): string[] {
  if (!brandName) {
    return [];
  }
  return BRAND_ALIASES.get(foodTextKey(brandName)) ?? [];
}

function buildAliases(sourceExternalId: string, name: string, brandName: string | null, row: CsvRow): AliasRow[] {
  const weightedAliases: Array<[string, number]> = [
    [name, 12],
    [[brandName, name].filter(Boolean).join(" "), 11],
    [row.product_name, 9],
    [[row.brand_name, row.product_name].filter(Boolean).join(" "), 8],
    [row.taxonomy_name, 4],
    ...brandAliases(brandName).flatMap((brandAlias) => [
      [brandAlias, 5] as [string, number],
      [[brandAlias, name].join(" "), 7] as [string, number],
    ]),
    ...synonymAliases(name).map((alias) => [alias, 6] as [string, number]),
  ];
  const byKey = new Map<string, AliasRow>();
  for (const [alias, weight] of weightedAliases) {
    const aliasText = nullableText(alias, 255);
    const aliasSortKey = nullableText(foodTextKey(alias), 191);
    if (!aliasText || !aliasSortKey || isMostlyNumeric(aliasSortKey)) {
      continue;
    }
    const existing = byKey.get(aliasSortKey);
    if (!existing || weight > existing.weight) {
      byKey.set(aliasSortKey, {
        sourceExternalId,
        locale: LOCALE,
        alias: aliasText,
        aliasSortKey,
        weight,
      });
    }
  }
  return [...byKey.values()].slice(0, 20);
}

function sanitizeRow(row: CsvRow, options: ImportOptions): { candidate: Candidate | null; rejected: RejectedRow | null } {
  const sourceExternalId = text(row.source_id || row.canonical_source_id, 191);
  const qualityWarnings = text(row.quality_warnings);
  const qualityScore = intValue(row.quality_score) ?? 0;
  const countryCode = nullableText(row.country_code, 2)?.toUpperCase() ?? null;
  const reasons: string[] = [];

  if (!sourceExternalId) reasons.push("missing_source_id");
  if (options.country !== "all" && countryCode !== options.country) reasons.push("country_not_selected");
  if (row.public !== "1") reasons.push("not_public");
  if (row.deleted === "1") reasons.push("deleted");
  if (qualityScore < options.minQuality) reasons.push("quality_below_threshold");
  if (!options.allowWarnings && qualityWarnings) reasons.push("upstream_quality_warning");

  const brandName = inferredBrandName(row.brand_name, row.product_name);
  const categoryName = cleanCategoryName(row.taxonomy_name) ?? null;
  const name = text(cleanFoodName(row.product_name, { brandName, categoryName }), 255);
  const grams = massServingGrams(row);
  if (!grams) reasons.push("serving_not_mass_based");
  reasons.push(...textQualityReasons(name, brandName, row));
  if (grams) {
    reasons.push(...nutritionReasons(row, grams));
  }

  if (reasons.length > 0 || !sourceExternalId || !grams) {
    return {
      candidate: null,
      rejected: {
        sourceId: sourceExternalId,
        productName: row.product_name,
        brandName: row.brand_name,
        countryCode: row.country_code,
        qualityScore: row.quality_score,
        qualityWarnings,
        reasons: [...new Set(reasons)],
      },
    };
  }

  const barcode = cleanBarcode(row.barcode);
  const duplicateGroupKey = barcode
    ? `myfitnesspal:barcode:${barcode}`
    : foodDedupeKey({ source: SOURCE_KIND, name, brand: brandName, category: categoryName });
  const energyKcal100g = kcalPer100(row.calories, grams);
  const protein100gCentiG = centiGPer100(row.protein_g, grams);
  const fat100gCentiG = centiGPer100(row.fat_g, grams);
  const carbs100gCentiG = centiGPer100(row.carbohydrates_g, grams);
  if (energyKcal100g === null || protein100gCentiG === null || fat100gCentiG === null || carbs100gCentiG === null) {
    return {
      candidate: null,
      rejected: {
        sourceId: sourceExternalId,
        productName: row.product_name,
        brandName: row.brand_name,
        countryCode: row.country_code,
        qualityScore: row.quality_score,
        qualityWarnings,
        reasons: ["required_nutrition_missing_after_conversion"],
      },
    };
  }

  const baseProduct = {
    sourceExternalId,
    publicId: publicId(sourceExternalId),
    sourceContentHash: nullableText(row.content_hash, 64) ?? hashRow(row),
    duplicateGroupKey,
    raw: row,
    name,
    brandName,
    categoryName,
    countryCode,
    nameSortKey: foodTextKey(name, 191),
    brandSortKey: brandName ? foodTextKey(brandName, 191) : null,
    servingSizeText: formatServing(row, grams),
    servingQuantityCentiG: Math.round(grams * 100),
    energyKcal100g,
    protein100gCentiG,
    fibre100gCentiG: centiGPer100(row.fiber_g, grams),
    fat100gCentiG,
    saturatedFat100gCentiG: centiGPer100(row.saturated_fat_g, grams),
    carbs100gCentiG,
    sugars100gCentiG: centiGPer100(row.sugar_g, grams),
    sodium100gMg: sodiumMgPer100(row.sodium_mg, grams),
    salt100gMg: null,
    dataQualityScore: clamp(qualityScore, 0, 100),
    popularityScore: popularityScore(row),
  };
  const salt100gMg =
    baseProduct.sodium100gMg === null ? null : clamp(Math.round(baseProduct.sodium100gMg * 2.5), 0, 100_000);
  const aliases = buildAliases(sourceExternalId, name, brandName, row);
  const searchText = foodTextKey(
    [
      name,
      row.product_name,
      brandName,
      row.brand_name,
      categoryName,
      row.taxonomy_name,
      row.health_labels,
      row.tags,
      aliases.map((alias) => alias.alias).join(" "),
    ].join(" "),
  );
  const product: CuratedProduct = {
    ...baseProduct,
    salt100gMg,
    searchText,
    sourceIds: new Set(sourceIdsForRow(row)),
    sourceRefRows: [],
    aliases,
  };
  return { candidate: { product, score: candidateScore(row, baseProduct) }, rejected: null };
}

function chooseCanonical(candidates: Candidate[]): CuratedProduct {
  return [...candidates].sort(
    (left, right) => right.score - left.score || left.product.sourceExternalId.localeCompare(right.product.sourceExternalId),
  )[0]!.product;
}

function sourceRefsForGroup(canonical: CuratedProduct, candidates: Candidate[]): SourceRefRow[] {
  const rows = new Map<string, SourceRefRow>();
  const canonicalBarcode = cleanBarcode(canonical.raw.barcode);
  for (const candidate of candidates) {
    const candidateBarcode = cleanBarcode(candidate.product.raw.barcode);
    for (const sourceExternalId of candidate.product.sourceIds) {
      rows.set(sourceExternalId, {
        sourceExternalId,
        barcode: candidateBarcode,
        canonicalSourceExternalId: canonical.sourceExternalId,
        canonicalBarcode,
        duplicateGroupKey: canonical.duplicateGroupKey,
        duplicateReason: sourceExternalId === canonical.sourceExternalId ? null : "same_curated_food",
        isCanonical: sourceExternalId === canonical.sourceExternalId,
        sourceContentHash: candidate.product.sourceContentHash,
      });
    }
  }
  rows.set(canonical.sourceExternalId, {
    sourceExternalId: canonical.sourceExternalId,
    barcode: canonicalBarcode,
    canonicalSourceExternalId: canonical.sourceExternalId,
    canonicalBarcode,
    duplicateGroupKey: canonical.duplicateGroupKey,
    duplicateReason: null,
    isCanonical: true,
    sourceContentHash: canonical.sourceContentHash,
  });
  return [...rows.values()];
}

function rowForProduct(product: CuratedProduct): Record<string, unknown> {
  return {
    source_external_id: product.sourceExternalId,
    public_id: product.publicId,
    duplicate_group_key: product.duplicateGroupKey,
    name: product.name,
    brand_name: product.brandName,
    category_name: product.categoryName,
    country_code: product.countryCode,
    name_sort_key: product.nameSortKey,
    brand_sort_key: product.brandSortKey,
    search_text: product.searchText,
    serving_size_text: product.servingSizeText,
    serving_quantity_centi_g: product.servingQuantityCentiG,
    energy_kcal_100g: product.energyKcal100g,
    protein_100g_centi_g: product.protein100gCentiG,
    fibre_100g_centi_g: product.fibre100gCentiG,
    fat_100g_centi_g: product.fat100gCentiG,
    saturated_fat_100g_centi_g: product.saturatedFat100gCentiG,
    carbs_100g_centi_g: product.carbs100gCentiG,
    sugars_100g_centi_g: product.sugars100gCentiG,
    sodium_100g_mg: product.sodium100gMg,
    salt_100g_mg: product.salt100gMg,
    data_quality_score: product.dataQualityScore,
    popularity_score: product.popularityScore,
    source_ref_count: product.sourceRefRows.length,
  };
}

function rowForSourceRef(row: SourceRefRow): Record<string, unknown> {
  return {
    source_external_id: row.sourceExternalId,
    canonical_source_external_id: row.canonicalSourceExternalId,
    barcode: row.barcode,
    canonical_barcode: row.canonicalBarcode,
    duplicate_group_key: row.duplicateGroupKey,
    duplicate_reason: row.duplicateReason,
    is_canonical: row.isCanonical ? 1 : 0,
    source_content_hash: row.sourceContentHash,
  };
}

function rowForAlias(row: AliasRow): Record<string, unknown> {
  return {
    source_external_id: row.sourceExternalId,
    locale: row.locale,
    alias: row.alias,
    alias_sort_key: row.aliasSortKey,
    weight: row.weight,
  };
}

function rowForRejected(row: RejectedRow): Record<string, unknown> {
  return {
    source_id: row.sourceId,
    product_name: row.productName,
    brand_name: row.brandName,
    country_code: row.countryCode,
    quality_score: row.qualityScore,
    quality_warnings: row.qualityWarnings,
    reasons: row.reasons.join("|"),
  };
}

async function writeCsv(path: string, columns: readonly string[], rows: Array<Record<string, unknown>>): Promise<void> {
  const writer = createWriteStream(path, { encoding: "utf8" });
  writer.write(`${columns.join(",")}\n`);
  for (const row of rows) {
    writer.write(`${csvLine(columns, row)}\n`);
  }
  await new Promise<void>((resolvePromise, reject) => {
    writer.end((error?: Error | null) => {
      if (error) reject(error);
      else resolvePromise();
    });
  });
}

async function curate(options: ImportOptions): Promise<{
  seen: number;
  candidateCount: number;
  products: CuratedProduct[];
  sourceRefs: SourceRefRow[];
  aliases: AliasRow[];
  rejected: RejectedRow[];
}> {
  if (!existsSync(options.input)) {
    throw new Error(`Input file not found: ${options.input}`);
  }

  const groups = new Map<string, Candidate[]>();
  const rejected: RejectedRow[] = [];
  const reader = createInterface({ input: createReadStream(options.input, { encoding: "utf8" }), crlfDelay: Infinity });
  let headers: string[] | undefined;
  let seen = 0;
  let candidateCount = 0;

  for await (const line of reader) {
    if (!headers) {
      headers = parseCsvLine(line).map((header) => header.replace(/^\uFEFF/, ""));
      continue;
    }
    if (!line.trim()) {
      continue;
    }
    if (options.limit > 0 && seen >= options.limit) {
      break;
    }
    seen += 1;
    const row = toCsvRow(headers, parseCsvLine(line));
    const { candidate, rejected: rejectedRow } = sanitizeRow(row, options);
    if (rejectedRow) {
      rejected.push(rejectedRow);
    }
    if (candidate) {
      const existing = groups.get(candidate.product.duplicateGroupKey) ?? [];
      existing.push(candidate);
      groups.set(candidate.product.duplicateGroupKey, existing);
      candidateCount += 1;
    }
    if (seen % options.progressInterval === 0) {
      console.error(
        `curated ${seen.toLocaleString("en-GB")} rows; ${candidateCount.toLocaleString("en-GB")} candidates`,
      );
    }
  }

  const products: CuratedProduct[] = [];
  const sourceRefsById = new Map<string, SourceRefRow>();
  const aliases: AliasRow[] = [];

  for (const candidates of groups.values()) {
    const canonical = chooseCanonical(candidates);
    const sourceRefs = sourceRefsForGroup(canonical, candidates);
    canonical.sourceRefRows = sourceRefs;
    canonical.sourceIds = new Set(sourceRefs.map((sourceRef) => sourceRef.sourceExternalId));
    products.push(canonical);
    for (const sourceRef of sourceRefs) {
      sourceRefsById.set(sourceRef.sourceExternalId, sourceRef);
    }
    aliases.push(...canonical.aliases);
  }

  products.sort((left, right) => right.popularityScore - left.popularityScore || left.name.localeCompare(right.name, "en"));
  aliases.sort((left, right) => left.sourceExternalId.localeCompare(right.sourceExternalId) || right.weight - left.weight);

  return { seen, candidateCount, products, sourceRefs: [...sourceRefsById.values()], aliases, rejected };
}

function benchmark(products: CuratedProduct[]): BenchmarkResult[] {
  return BENCHMARK_QUERIES.map((query) => {
    const startedAt = Date.now();
    const tokens = foodTextKey(query).split(" ").filter(Boolean);
    const scored = products
      .map((product) => {
        const key = product.searchText;
        if (!tokens.every((token) => key.includes(token))) {
          return null;
        }
        let score = product.dataQualityScore * 0.8 + product.popularityScore * 0.08;
        const nameKey = foodTextKey(product.name);
        const brandKey = foodTextKey(product.brandName);
        if (nameKey === tokens.join(" ")) score += 150;
        if ([brandKey, nameKey].filter(Boolean).join(" ").includes(tokens.join(" "))) score += 80;
        if (tokens.some((token) => brandKey.includes(token))) score += 25;
        return { product, score };
      })
      .filter((item): item is { product: CuratedProduct; score: number } => item !== null)
      .sort((left, right) => right.score - left.score)
      .slice(0, 5);

    return {
      query,
      duration_ms: Date.now() - startedAt,
      result_count: scored.length,
      top_results: scored.map(({ product, score }) => ({
        name: product.name,
        brand: product.brandName,
        score: Math.round(score),
      })),
    };
  });
}

function rowPlaceholders(rowCount: number, columnCount: number): string {
  return Array.from({ length: rowCount }, () => `(${Array.from({ length: columnCount }, () => "?").join(", ")})`).join(", ");
}

function chunked<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

async function executeBulk(
  conn: DatabaseConnection,
  table: string,
  columns: readonly string[],
  rows: unknown[][],
  onDuplicate: string,
  batchSize: number,
): Promise<number> {
  let imported = 0;
  for (const chunk of chunked(rows, batchSize)) {
    if (chunk.length === 0) {
      continue;
    }
    await conn.execute(
      `insert into ${table} (${columns.join(", ")})
       values ${rowPlaceholders(chunk.length, columns.length)}
       ${onDuplicate}`,
      chunk.flat(),
    );
    imported += chunk.length;
  }
  return imported;
}

function mysqlDatetime(date: Date): string {
  return date.toISOString().slice(0, 23).replace("T", " ");
}

async function insertImportBatch(conn: DatabaseConnection, options: ImportOptions, summary: ImportSummary): Promise<number> {
  const batchPublicId = `fib_${hash(`${SOURCE_KIND}:${Date.now()}:${options.input}`).slice(0, 24)}`;
  await conn.execute(
    `insert into food_import_batches
      (public_id, source_kind, source_dataset, source_url, product_rows_seen, uk_rows_seen, output_product_count,
       filtered_missing_name_count, filtered_missing_core_macro_count, filtered_implausible_nutrition_count, metadata)
     values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      batchPublicId,
      SOURCE_KIND,
      "myfitnesspal_curated_production",
      options.input,
      summary.seen_rows,
      options.country === "GB" ? summary.seen_rows : 0,
      summary.promoted_products,
      summary.rejection_reasons.missing_source_id ?? 0,
      (summary.rejection_reasons.invalid_calories_per_100g ?? 0) +
        (summary.rejection_reasons.invalid_protein_per_100g ?? 0) +
        (summary.rejection_reasons.invalid_fat_per_100g ?? 0) +
        (summary.rejection_reasons.invalid_carbs_per_100g ?? 0),
      (summary.rejection_reasons.macro_sum_implausible_per_100g ?? 0) +
        (summary.rejection_reasons.saturated_fat_exceeds_fat ?? 0) +
        (summary.rejection_reasons.sugar_exceeds_carbs ?? 0),
      JSON.stringify(summary),
    ],
  );
  const result = await conn.execute("select id from food_import_batches where public_id = ?", [batchPublicId]);
  return Number(result.rows[0]?.id ?? 0);
}

async function foodItemIdsForExternalIds(conn: DatabaseConnection, externalIds: string[]): Promise<Map<string, number>> {
  const ids = new Map<string, number>();
  for (const chunk of chunked([...new Set(externalIds)], 500)) {
    const result = await conn.execute(
      `select id, source_external_id from food_items where source_kind = ? and source_external_id in (${chunk
        .map(() => "?")
        .join(", ")})`,
      [SOURCE_KIND, ...chunk],
    );
    for (const row of result.rows) {
      ids.set(String(row.source_external_id), Number(row.id));
    }
  }
  return ids;
}

async function applyToDatabase(
  products: CuratedProduct[],
  sourceRefs: SourceRefRow[],
  aliases: AliasRow[],
  options: ImportOptions,
  summary: ImportSummary,
): Promise<NonNullable<ImportSummary["database"]>> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required for --apply.");
  }
  const conn = connect({ url: databaseUrl });
  const batchId = await insertImportBatch(conn, options, summary);
  const now = mysqlDatetime(new Date());

  let productsImported = 0;
  for (const chunk of chunked(products, options.batchSize)) {
    const productRows = chunk.map((product) => [
      product.publicId,
      SOURCE_KIND,
      product.sourceExternalId,
      batchId,
      product.sourceContentHash,
      "public",
      null,
      null,
      product.name,
      product.brandName,
      product.nameSortKey,
      product.brandSortKey,
      product.searchText,
      null,
      product.servingSizeText,
      product.servingQuantityCentiG,
      null,
      product.energyKcal100g,
      null,
      product.protein100gCentiG,
      product.fibre100gCentiG,
      product.fat100gCentiG,
      product.saturatedFat100gCentiG,
      product.carbs100gCentiG,
      product.sugars100gCentiG,
      product.salt100gMg,
      product.sodium100gMg,
      null,
      null,
      product.dataQualityScore,
      product.popularityScore,
      null,
      now,
      null,
    ]);
    productsImported += await executeBulk(
      conn,
      "food_items",
      [
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
      ],
      productRows,
      `on duplicate key update
         source_import_batch_id = values(source_import_batch_id),
         source_content_hash = values(source_content_hash),
         name = values(name),
         brand_name = values(brand_name),
         name_sort_key = values(name_sort_key),
         brand_sort_key = values(brand_sort_key),
         search_text = values(search_text),
         serving_size_text = values(serving_size_text),
         serving_quantity_centi_g = values(serving_quantity_centi_g),
         energy_kcal_100g = values(energy_kcal_100g),
         protein_100g_centi_g = values(protein_100g_centi_g),
         fibre_100g_centi_g = values(fibre_100g_centi_g),
         fat_100g_centi_g = values(fat_100g_centi_g),
         saturated_fat_100g_centi_g = values(saturated_fat_100g_centi_g),
         carbs_100g_centi_g = values(carbs_100g_centi_g),
         sugars_100g_centi_g = values(sugars_100g_centi_g),
         salt_100g_mg = values(salt_100g_mg),
         sodium_100g_mg = values(sodium_100g_mg),
         data_quality_score = values(data_quality_score),
         popularity_score = values(popularity_score),
         source_last_seen_at = values(source_last_seen_at),
         source_deleted_at = null`,
      options.batchSize,
    );
    if (productsImported % options.progressInterval === 0) {
      console.error(`imported ${productsImported.toLocaleString("en-GB")} products`);
    }
  }

  const ids = await foodItemIdsForExternalIds(conn, products.map((product) => product.sourceExternalId));
  const canonicalIdBySourceId = new Map<string, number>();
  for (const product of products) {
    const id = ids.get(product.sourceExternalId);
    if (id) {
      canonicalIdBySourceId.set(product.sourceExternalId, id);
    }
  }

  const sourceRefRows = sourceRefs.flatMap((sourceRef) => {
    const foodItemId = canonicalIdBySourceId.get(sourceRef.canonicalSourceExternalId);
    if (!foodItemId) {
      return [];
    }
    return [[
      foodItemId,
      SOURCE_KIND,
      sourceRef.sourceExternalId,
      sourceRef.barcode,
      batchId,
      sourceRef.canonicalSourceExternalId,
      sourceRef.canonicalBarcode,
      sourceRef.duplicateGroupKey.slice(0, 191),
      sourceRef.duplicateReason,
      sourceRef.isCanonical ? 1 : 0,
      sourceRef.sourceContentHash,
    ]];
  });
  const sourceRefsImported = await executeBulk(
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
    sourceRefRows,
    `on duplicate key update
       food_item_id = values(food_item_id),
       barcode = values(barcode),
       source_import_batch_id = values(source_import_batch_id),
       canonical_source_external_id = values(canonical_source_external_id),
       canonical_barcode = values(canonical_barcode),
       duplicate_group_key = values(duplicate_group_key),
       duplicate_reason = values(duplicate_reason),
       is_canonical = values(is_canonical),
       source_content_hash = values(source_content_hash)`,
    Math.max(options.batchSize, 500),
  );

  const detailRows = products.flatMap((product) => {
    const foodItemId = canonicalIdBySourceId.get(product.sourceExternalId);
    if (!foodItemId) {
      return [];
    }
    return [[
      foodItemId,
      product.categoryName,
      product.categoryName,
      product.categoryName ? JSON.stringify([foodTextKey(product.categoryName)]) : null,
      null,
      null,
      null,
      null,
      product.countryCode ? JSON.stringify([product.countryCode.toLowerCase()]) : null,
      null,
      null,
      null,
      null,
    ]];
  });
  await executeBulk(
    conn,
    "food_item_details",
    [
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
    ],
    detailRows,
    `on duplicate key update
       category_text = values(category_text),
       category_tags = values(category_tags),
       countries_tags = values(countries_tags)`,
    options.batchSize,
  );

  const rawRows = products.flatMap((product) => {
    const foodItemId = canonicalIdBySourceId.get(product.sourceExternalId);
    return foodItemId ? [[foodItemId, SOURCE_KIND, product.sourceContentHash, JSON.stringify(product.raw)]] : [];
  });
  await executeBulk(
    conn,
    "food_item_raw_sources",
    ["food_item_id", "source_kind", "source_content_hash", "raw_source"],
    rawRows,
    `on duplicate key update
       source_kind = values(source_kind),
       source_content_hash = values(source_content_hash),
       raw_source = values(raw_source)`,
    Math.max(50, Math.floor(options.batchSize / 2)),
  );

  const marketRows = products.flatMap((product) => {
    const foodItemId = canonicalIdBySourceId.get(product.sourceExternalId);
    return foodItemId && product.countryCode ? [[foodItemId, product.countryCode, product.countryCode.toLowerCase()]] : [];
  });
  await executeBulk(
    conn,
    "food_item_markets",
    ["food_item_id", "country_code", "source_tag"],
    marketRows,
    "on duplicate key update source_tag = values(source_tag)",
    Math.max(options.batchSize, 500),
  );

  const servingRows = products.flatMap((product) => {
    const foodItemId = canonicalIdBySourceId.get(product.sourceExternalId);
    if (!foodItemId) {
      return [];
    }
    return [
      [foodItemId, "serving", product.servingSizeText, product.servingQuantityCentiG, "g", null, 1, SOURCE_KIND],
      [foodItemId, "100g", "100 g", 10_000, "g", null, 0, SOURCE_KIND],
    ];
  });
  await executeBulk(
    conn,
    "food_item_servings",
    ["food_item_id", "serving_kind", "label", "quantity_centi_g", "unit", "serving_count_centi", "is_default", "source"],
    servingRows,
    `on duplicate key update
       quantity_centi_g = values(quantity_centi_g),
       is_default = values(is_default),
       source = values(source)`,
    Math.max(options.batchSize, 500),
  );

  const aliasRows = aliases.flatMap((alias) => {
    const foodItemId = canonicalIdBySourceId.get(alias.sourceExternalId);
    return foodItemId ? [[foodItemId, alias.locale, alias.alias, alias.aliasSortKey, alias.weight]] : [];
  });
  const aliasesImported = await executeBulk(
    conn,
    "food_search_aliases",
    ["food_item_id", "locale", "alias", "alias_sort_key", "weight"],
    aliasRows,
    `on duplicate key update
       alias = values(alias),
       weight = values(weight)`,
    Math.max(options.batchSize, 500),
  );

  return { batch_id: batchId, products_imported: productsImported, source_refs_imported: sourceRefsImported, aliases_imported: aliasesImported };
}

async function main(): Promise<void> {
  if (hasFlag("--help")) {
    console.log(USAGE);
    return;
  }

  const options: ImportOptions = {
    apply: hasFlag("--apply"),
    input: resolve(PROJECT_ROOT, argValue("--input", DEFAULT_INPUT)),
    outputDir: resolve(PROJECT_ROOT, argValue("--output-dir", DEFAULT_OUTPUT_DIR)),
    country: argValue("--country", "GB").toUpperCase(),
    limit: flagNumber("--limit", 0),
    batchSize: Math.max(1, flagNumber("--batch-size", 250)),
    progressInterval: Math.max(10_000, flagNumber("--progress-interval", 50_000)),
    minQuality: flagNumber("--min-quality", 45),
    allowWarnings: hasFlag("--allow-warnings"),
  };

  await mkdir(options.outputDir, { recursive: true });
  const { seen, candidateCount, products, sourceRefs, aliases, rejected } = await curate(options);
  const duplicateGroupsCollapsed = candidateCount - products.length;
  const benchmarks = benchmark(products);
  let summary: ImportSummary = {
    generated_at: new Date().toISOString(),
    mode: options.apply ? "apply" : "dry-run",
    input: options.input,
    output_dir: options.outputDir,
    seen_rows: seen,
    candidate_rows: candidateCount,
    promoted_products: products.length,
    source_refs: sourceRefs.length,
    aliases: aliases.length,
    rejected_rows: rejected.length,
    duplicate_groups_collapsed: duplicateGroupsCollapsed,
    options: {
      country: options.country,
      min_quality: options.minQuality,
      allow_warnings: options.allowWarnings,
      limit: options.limit,
    },
    rejection_reasons: rejectionReasonCounts(rejected),
    benchmark_queries: benchmarks,
  };

  await writeCsv(resolve(options.outputDir, "products.csv"), PRODUCT_COLUMNS, products.map(rowForProduct));
  await writeCsv(resolve(options.outputDir, "source_refs.csv"), SOURCE_REF_COLUMNS, sourceRefs.map(rowForSourceRef));
  await writeCsv(resolve(options.outputDir, "aliases.csv"), ALIAS_COLUMNS, aliases.map(rowForAlias));
  await writeCsv(resolve(options.outputDir, "rejected.csv"), REJECTED_COLUMNS, rejected.map(rowForRejected));

  if (options.apply) {
    const database = await applyToDatabase(products, sourceRefs, aliases, options, summary);
    summary = { ...summary, database };
  }

  await writeFile(resolve(options.outputDir, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
