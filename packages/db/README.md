# Pippa Database Schema

Pippa uses Drizzle with PlanetScale MySQL/Vitess. The schema is optimized for the mobile app's hot paths first: auth session lookup, food search, barcode lookup, fast logging, daily dashboard totals, cycle context, privacy controls, and share cards.

Production should keep the Vercel app and PlanetScale database in `eu-west-2`, and use the PlanetScale serverless driver from the Next.js app/API layer.

## Design Choices

- Use `BIGINT UNSIGNED AUTO_INCREMENT` primary keys for narrow clustered indexes.
- Keep Better Auth on numeric IDs with `advanced.database.generateId: "serial"`.
- Do not create database-level foreign-key constraints. Relations are represented in Drizzle and enforced in services so PlanetScale can avoid foreign-key locking overhead and keep schema deploys simple.
- Keep hot nutrition columns on `food_items`. Food search, barcode lookup, and log creation nearly always need calories, protein, fibre, fat, and serving information.
- Move wide/rare fields into side tables: ingredients, labels, allergens, raw import payloads, OCR, and assets live outside the hot food row. `food_item_raw_sources` is intentionally separate from `food_item_details` so normal detail views do not pull source JSON.
- Track repeatable public-food imports with `food_import_batches`, `source_content_hash`, `source_last_seen_at`, and `source_deleted_at` so source refreshes can update, mark stale, or audit rows without destructive one-off loads.
- Store market availability in `food_item_markets` instead of querying country JSON for hot filters.
- Store user-selectable/default portions in `food_item_servings`; keep the simple serving fields on `food_items` for barcode/logging fast paths.
- Store per-user corrections in `user_food_overrides` instead of mutating public food rows. When a user edits calories, protein, fibre, fat, carbs, serving text, or brand/name for a public food, service code should resolve the public row plus that user's override before displaying or logging it.
- Store macro values as scaled integers: centigrams for grams and milligrams for salt/sodium. This keeps rows compact and avoids floating-point drift.
- Use append-only records for sensitive consent changes. Do not send health, cycle, food, weight, symptom, or sensitive community fields to broad analytics.
- Denormalize daily totals into `daily_nutrition_summaries` so the home dashboard reads one row instead of aggregating logs every time.

## Hot Query Paths

- Session: `session.token` unique lookup, then Drizzle relation to `user`.
- Barcode: `food_items.barcode` unique lookup.
- Search: visibility-scoped active-food prefix indexes on normalized names plus a manual MySQL `FULLTEXT` index for `food_items`. Public food search should include `visibility = 'public'` and `source_deleted_at IS NULL`.
- Alias search: `food_search_aliases(locale, alias_sort_key, weight)` first, then join to active/public `food_items` by ID.
- Private/user food search: `food_items(owner_user_id, name_sort_key, brand_sort_key)`.
- User food corrections: lookup by `user_food_overrides(user_id, food_item_id)` when rendering food detail or creating a meal log item.
- Saved meal search: `saved_meals(user_id, name_sort_key)`.
- Recents: `user_food_recents(user_id, last_logged_at)`.
- Daily diary: active meal logs use `meal_logs(user_id, log_date, deleted_at, logged_at)` and day item recalculation uses `meal_log_items(user_id, log_date, meal_log_id, position)`.
- Home dashboard: `daily_nutrition_summaries(user_id, summary_date)`, current `target_profiles`, and recent cycle entries.
- Share cards: explicit metric booleans keep calories hidden by default.

## Open Food Facts Import Filters

The UK local dataset builder intentionally drops rows before database import when they are not useful enough for fast logging:

- Product must be in the configured UK country tags.
- Barcode must normalize to a GTIN-8, GTIN-12, GTIN-13, or GTIN-14 value and pass the GTIN check digit.
- Product must have a non-empty name.
- Product must have core macro data: kcal, protein, fat, and carbohydrates per 100g. Fibre remains important to Pippa but is optional in OFF because coverage is materially lower.
- Per-100g nutrition must be plausible. The builder rejects negative values, values above 100g per 100g for gram-based nutrients, kcal above 1000 per 100g, kJ above 5000 per 100g, and obviously impossible macro totals.
- Open Food Facts placeholder image URLs under `/invalid/` are cleared rather than imported as usable product images.

## Better Auth

Recommended auth settings:

```ts
betterAuth({
  database: drizzleAdapter(db, {
    provider: "mysql",
    schema,
  }),
  advanced: {
    database: {
      generateId: "serial",
    },
  },
  experimental: {
    joins: true,
  },
  plugins: [
    emailOTP({
      otpLength: 6,
      expiresIn: 300,
      allowedAttempts: 3,
      storeOTP: "hashed",
    }),
  ],
});
```

Better Auth still exposes ID values as strings at the API boundary when using serial IDs, so API/domain code should treat auth IDs as opaque strings and parse once at the service boundary before querying numeric `user_id` columns.

## Food Search

Drizzle Kit does not currently model MySQL full-text indexes well enough for this schema. The generated initial migration includes the manual full-text statement, and `sql/food-search-fulltext.sql` mirrors it for review.

Barcode lookup should never use text search. For typed search:

1. Try exact barcode if the query is numeric.
2. Query `food_items` prefix and `food_search_aliases` for autocomplete.
3. Use `MATCH ... AGAINST` on the full-text index for multi-word queries.
4. Rank by text score, `data_quality_score`, and `popularity_score`.

## Commands

```sh
bun --filter @pippa/db generate
bun --filter @pippa/db typecheck
```

Only run `migrate` against a reviewed PlanetScale branch. Production schema changes should go through the PlanetScale deploy-request flow.
