export type FoodDedupeInput = {
  source?: string;
  name?: unknown;
  brand?: unknown;
  category?: unknown;
};

export type CleanFoodNameOptions = {
  brandName?: string | null;
  fallbackName?: unknown;
  categoryName?: unknown;
};

const SMALL_TITLE_WORDS = new Set(["a", "an", "and", "as", "for", "from", "in", "of", "on", "or", "per", "the", "to", "with"]);
const DISPLAY_WORDS = new Map([
  ["bbq", "BBQ"],
  ["blt", "BLT"],
  ["uk", "UK"],
  ["usa", "USA"],
  ["m&s", "M&S"],
]);
const WORD_CORRECTIONS = new Map([
  ["beeer", "beer"],
  ["ciabbatin", "ciabattin"],
  ["giabattin", "ciabattin"],
  ["mackrel", "mackerel"],
  ["mozerrella", "mozzarella"],
  ["rostand", "roasted veg"],
  ["soursough", "sourdough"],
]);
const TOKEN_ALIASES = new Map([
  ["vegetable", "veg"],
  ["vegetables", "veg"],
  ["veggie", "veg"],
  ["veggies", "veg"],
]);
const DEDUPE_STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "bread",
  "breads",
  "from",
  "in",
  "loaf",
  "loaves",
  "made",
  "of",
  "pack",
  "per",
  "slice",
  "sliced",
  "the",
  "with",
]);

export function cleanFoodBrand(value: unknown): string | undefined {
  const candidates = splitBrandCandidates(cleanDisplayText(value))
    .map((candidate) => cleanBrandCandidate(candidate))
    .filter((candidate) => candidate.length > 0);

  if (candidates.length === 0) {
    return undefined;
  }

  const canonicalCandidates = unique(candidates.map((candidate) => knownBrandDisplay(candidate) ?? candidate));
  const retailerSubBrand = canonicalCandidates.find((candidate) => {
    const key = foodTextKey(candidate);
    return key.includes("sainsbury") && key.includes("taste") && key.includes("difference");
  });

  return retailerSubBrand ?? canonicalCandidates[0];
}

export function cleanFoodName(value: unknown, options: CleanFoodNameOptions = {}): string {
  const brandName = options.brandName ?? undefined;
  const rawName = cleanDisplayText(value);
  const fallbackName = cleanDisplayText(options.fallbackName);
  const categoryName = cleanCategoryName(options.categoryName);
  const firstPass = titleCaseFoodText(applyWordCorrections(rawName));
  const withoutBrand = stripLeadingBrand(firstPass, brandName);
  const selected = [
    withoutBrand,
    stripLeadingBrand(fallbackName, brandName),
    stripLeadingBrand(categoryName ?? "", brandName),
    firstPass,
  ].find((candidate) => {
    return candidate && foodTextKey(candidate).length > 0;
  });
  const cleaned = titleCaseFoodText(applyWordCorrections(selected ?? ""));

  return cleaned || firstPass;
}

export function cleanCategoryName(value: unknown): string | undefined {
  const raw = cleanDisplayText(value)
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .at(-1);

  if (!raw) {
    return undefined;
  }

  const withoutPrefix = raw.replace(/^en:/i, "").replace(/-/g, " ");
  const cased = titleCaseFoodText(applyWordCorrections(withoutPrefix));

  return cased
    .replace(/\bBreads\b/g, "Bread")
    .replace(/\bProducts\b/g, "Products")
    .trim();
}

export function cleanDisplayText(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map((item) => cleanDisplayText(item)).filter(Boolean).join(", ");
  }

  return decodeHtml(String(value ?? ""))
    .replace(/[\u2018\u2019\u02BC]/g, "'")
    .replace(/[\u201C\u201D]/g, "\"")
    .replace(/\u0000/g, "")
    .replace(/[_]+/g, " ")
    .replace(/\s*-\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function foodTextKey(value: unknown, maxLength?: number): string {
  const key = cleanDisplayText(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");

  return maxLength === undefined ? key : key.slice(0, maxLength);
}

export function foodBrandKey(value: unknown): string {
  const display = cleanFoodBrand(value) ?? cleanDisplayText(value);
  return foodTextKey(display);
}

export function foodDedupeKey(input: FoodDedupeInput): string {
  const brandKey = foodBrandDedupeKey(input.brand);
  const nameKey = compactFoodNameKey(input.name) || compactFoodNameKey(input.category) || "unnamed";

  return [input.source ?? "food", brandKey || "brandless", nameKey].join(":");
}

export function compactFoodNameKey(value: unknown): string {
  const corrected = applyWordCorrections(cleanDisplayText(value));
  const tokens = foodTextKey(corrected)
    .split(" ")
    .map(normalizedFoodToken)
    .filter((token) => token && !DEDUPE_STOP_WORDS.has(token));

  return unique(tokens).sort((a, b) => a.localeCompare(b, "en")).join(" ");
}

function foodBrandDedupeKey(value: unknown): string {
  return foodBrandKey(value).replace(/\s+/g, "");
}

function splitBrandCandidates(value: string): string[] {
  return value
    .split(/[,|]/)
    .map((candidate) => candidate.trim())
    .filter(Boolean);
}

function cleanBrandCandidate(value: string): string {
  const withoutBy = value.replace(/^by\s+/i, "");
  return titleCaseFoodText(applyWordCorrections(withoutBy));
}

function knownBrandDisplay(value: string): string | undefined {
  const key = foodTextKey(value);
  const compact = key.replace(/\s+/g, "");

  if (compact === "sainsburystastethedifference" || compact === "tastethedifferencesainsburys") {
    return "Sainsbury's Taste the Difference";
  }
  if (compact === "sainsburys" || key === "sainsbury s") {
    return "Sainsbury's";
  }
  if (compact === "jasonseveryday" || key === "jason s every day") {
    return "Jason's Every Day";
  }
  if (
    compact === "jasons" ||
    compact === "jasonsourdough" ||
    compact === "jasonsoursough" ||
    compact === "jasonssourdough" ||
    compact === "jasonssoursough" ||
    key === "jason sourdough" ||
    key === "jason soursough" ||
    key === "jason s" ||
    key === "jason s sourdough" ||
    key === "jason s soursough"
  ) {
    return "Jason's Sourdough";
  }
  if (compact === "marksandspencer" || compact === "marksspencer" || compact === "mands" || compact === "ms") {
    return "M&S";
  }
  if (
    compact === "mandsfood" ||
    compact === "msfood" ||
    compact === "marksandspencerfood" ||
    compact === "marksspencerfood"
  ) {
    return "M&S";
  }
  if (compact === "coop" || compact === "coopuk" || compact === "cooperative" || compact === "thecoop") {
    return "Co-op";
  }
  if (compact === "prepkitchen" || compact === "prepkitchenuk") {
    return "Prep Kitchen";
  }
  if (compact === "morrisons" || key === "morrison s") {
    return "Morrisons";
  }
  if (compact === "tescofinest") {
    return "Tesco Finest";
  }
  if (compact === "tesco") {
    return "Tesco";
  }
  if (compact === "fuelhub") {
    return "Fuel Hub";
  }
  if (compact === "asda") {
    return "Asda";
  }
  if (compact === "waitrose") {
    return "Waitrose";
  }
  if (compact === "ocado") {
    return "Ocado";
  }
  if (compact === "aldi") {
    return "Aldi";
  }
  if (compact === "lidl") {
    return "Lidl";
  }

  return undefined;
}

function stripLeadingBrand(name: string, brandName: string | undefined): string {
  if (!brandName) {
    return name;
  }

  const nameTokens = foodTextKey(name).split(" ").filter(Boolean);
  for (const prefix of brandPrefixTokenCandidates(brandName)) {
    if (!startsWithTokens(nameTokens, prefix)) {
      continue;
    }

    const remaining = nameTokens.slice(prefix.length).join(" ");
    return remaining ? titleCaseFoodText(remaining) : "";
  }

  return name;
}

function brandPrefixTokenCandidates(brandName: string): string[][] {
  const key = foodBrandKey(brandName);
  const candidates = [key.split(" ").filter(Boolean)];
  const compactKey = key.replace(/\s+/g, "");

  if (compactKey && compactKey !== key) {
    candidates.push([compactKey]);
  }

  if (key === "jason s sourdough") {
    candidates.push(["jasons", "sourdough"], ["jasons"], ["jason", "s"]);
  }
  if (key === "sainsbury s") {
    candidates.push(["sainsburys"], ["by", "sainsbury", "s"]);
  }

  return candidates.filter((tokens) => tokens.length > 0);
}

function startsWithTokens(value: string[], prefix: string[]): boolean {
  if (prefix.length > value.length) {
    return false;
  }

  return prefix.every((token, index) => value[index] === token);
}

function applyWordCorrections(value: string): string {
  return value.replace(/[A-Za-z]+/g, (word) => WORD_CORRECTIONS.get(word.toLowerCase()) ?? word);
}

function normalizedFoodToken(value: string): string {
  const corrected = WORD_CORRECTIONS.get(value) ?? value;
  const alias = TOKEN_ALIASES.get(corrected);
  if (alias) {
    return alias;
  }

  return singularFoodToken(corrected);
}

function singularFoodToken(value: string): string {
  if (value.length <= 3 || /(ss|us)$/.test(value)) {
    return value;
  }
  if (value.endsWith("ies") && value.length > 4) {
    return `${value.slice(0, -3)}y`;
  }
  if (value.endsWith("oes") && value.length > 4) {
    return value.slice(0, -2);
  }
  if (value.endsWith("ves") && value.length > 4) {
    return `${value.slice(0, -3)}f`;
  }
  if (value.endsWith("s") && !value.endsWith("ss")) {
    return value.slice(0, -1);
  }

  return value;
}

function titleCaseFoodText(value: string): string {
  return value.replace(/[A-Za-z][A-Za-z']*/g, (word, offset) => formatTitleWord(word, offset === 0));
}

function formatTitleWord(word: string, isFirstWord: boolean): string {
  const lower = word.toLowerCase();
  const displayWord = DISPLAY_WORDS.get(lower);
  if (displayWord) {
    return displayWord;
  }
  if (!isFirstWord && SMALL_TITLE_WORDS.has(lower)) {
    return lower;
  }
  if (/^[a-z]+('[a-z]+)?$/i.test(word)) {
    return lower.replace(/^[a-z]/, (char) => char.toUpperCase()).replace(/'s\b/i, "'s");
  }

  return word;
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function decodeHtml(value: string): string {
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
