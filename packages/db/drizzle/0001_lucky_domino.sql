CREATE TABLE `food_import_batches` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`public_id` varchar(32) NOT NULL,
	`source_kind` varchar(32) NOT NULL,
	`source_dataset` varchar(64) NOT NULL,
	`source_url` varchar(1024),
	`asset_keys_url` varchar(1024),
	`downloaded_at_epoch` int unsigned,
	`product_rows_seen` int unsigned NOT NULL DEFAULT 0,
	`uk_rows_seen` int unsigned NOT NULL DEFAULT 0,
	`output_product_count` int unsigned NOT NULL DEFAULT 0,
	`filtered_missing_name_count` int unsigned NOT NULL DEFAULT 0,
	`filtered_missing_core_macro_count` int unsigned NOT NULL DEFAULT 0,
	`filtered_invalid_gtin_count` int unsigned NOT NULL DEFAULT 0,
	`filtered_implausible_nutrition_count` int unsigned NOT NULL DEFAULT 0,
	`content_hash` varchar(64),
	`metadata` json,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `food_import_batches_id` PRIMARY KEY(`id`),
	CONSTRAINT `food_import_batches_public_id_uq` UNIQUE(`public_id`)
);
--> statement-breakpoint
CREATE TABLE `food_item_markets` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`food_item_id` bigint unsigned NOT NULL,
	`country_code` varchar(2) NOT NULL,
	`source_tag` varchar(64) NOT NULL,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `food_item_markets_id` PRIMARY KEY(`id`),
	CONSTRAINT `food_item_markets_food_country_uq` UNIQUE(`food_item_id`,`country_code`)
);
--> statement-breakpoint
CREATE TABLE `food_item_servings` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`food_item_id` bigint unsigned NOT NULL,
	`serving_kind` varchar(32) NOT NULL,
	`label` varchar(128) NOT NULL,
	`quantity_centi_g` mediumint unsigned,
	`unit` varchar(32) NOT NULL DEFAULT 'g',
	`serving_count_centi` mediumint unsigned,
	`is_default` tinyint unsigned NOT NULL DEFAULT 0,
	`source` varchar(32) NOT NULL DEFAULT 'open_food_facts',
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `food_item_servings_id` PRIMARY KEY(`id`),
	CONSTRAINT `food_item_servings_food_kind_label_uq` UNIQUE(`food_item_id`,`serving_kind`,`label`)
);
--> statement-breakpoint
ALTER TABLE `food_items` ADD `source_import_batch_id` bigint unsigned;--> statement-breakpoint
ALTER TABLE `food_items` ADD `source_content_hash` varchar(64);--> statement-breakpoint
ALTER TABLE `food_items` ADD `gtin_valid` tinyint unsigned;--> statement-breakpoint
ALTER TABLE `food_items` ADD `quantity_text` varchar(128);--> statement-breakpoint
ALTER TABLE `food_items` ADD `source_last_seen_at` datetime(3);--> statement-breakpoint
ALTER TABLE `food_items` ADD `source_deleted_at` datetime(3);--> statement-breakpoint
CREATE INDEX `food_import_batches_source_created_idx` ON `food_import_batches` (`source_kind`,`created_at`);--> statement-breakpoint
CREATE INDEX `food_item_markets_country_food_idx` ON `food_item_markets` (`country_code`,`food_item_id`);--> statement-breakpoint
CREATE INDEX `food_item_servings_food_default_idx` ON `food_item_servings` (`food_item_id`,`is_default`);--> statement-breakpoint
CREATE INDEX `food_items_visibility_name_idx` ON `food_items` (`visibility`,`name_sort_key`,`brand_sort_key`);--> statement-breakpoint
CREATE INDEX `food_items_import_batch_idx` ON `food_items` (`source_import_batch_id`);--> statement-breakpoint
CREATE INDEX `food_items_source_seen_idx` ON `food_items` (`source_kind`,`source_last_seen_at`);