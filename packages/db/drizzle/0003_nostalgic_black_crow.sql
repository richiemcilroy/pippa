CREATE TABLE `food_item_raw_sources` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`food_item_id` bigint unsigned NOT NULL,
	`source_kind` varchar(32) NOT NULL,
	`source_content_hash` varchar(64),
	`raw_source` json NOT NULL,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `food_item_raw_sources_id` PRIMARY KEY(`id`),
	CONSTRAINT `food_item_raw_sources_food_uq` UNIQUE(`food_item_id`)
);
--> statement-breakpoint
DROP INDEX `food_items_visibility_name_idx` ON `food_items`;--> statement-breakpoint
DROP INDEX `food_items_visibility_quality_idx` ON `food_items`;--> statement-breakpoint
CREATE INDEX `food_item_raw_sources_source_idx` ON `food_item_raw_sources` (`source_kind`,`source_content_hash`);--> statement-breakpoint
CREATE INDEX `food_items_visibility_name_idx` ON `food_items` (`visibility`,`source_deleted_at`,`name_sort_key`,`brand_sort_key`);--> statement-breakpoint
CREATE INDEX `food_items_visibility_quality_idx` ON `food_items` (`visibility`,`source_deleted_at`,`data_quality_score`,`popularity_score`);--> statement-breakpoint
ALTER TABLE `food_item_details` DROP COLUMN `raw_source`;