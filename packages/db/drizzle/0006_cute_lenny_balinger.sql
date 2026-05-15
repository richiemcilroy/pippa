CREATE TABLE `food_item_source_refs` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`food_item_id` bigint unsigned NOT NULL,
	`source_kind` varchar(32) NOT NULL,
	`source_external_id` varchar(191) NOT NULL,
	`barcode` varchar(14) NOT NULL,
	`source_import_batch_id` bigint unsigned,
	`canonical_source_external_id` varchar(191) NOT NULL,
	`canonical_barcode` varchar(14) NOT NULL,
	`duplicate_group_key` varchar(191),
	`duplicate_reason` varchar(64),
	`is_canonical` tinyint unsigned NOT NULL DEFAULT 0,
	`source_content_hash` varchar(64),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `food_item_source_refs_id` PRIMARY KEY(`id`),
	CONSTRAINT `food_item_source_refs_source_external_uq` UNIQUE(`source_kind`,`source_external_id`),
	CONSTRAINT `food_item_source_refs_source_barcode_uq` UNIQUE(`source_kind`,`barcode`)
);
--> statement-breakpoint
CREATE INDEX `food_item_source_refs_food_idx` ON `food_item_source_refs` (`food_item_id`);--> statement-breakpoint
CREATE INDEX `food_item_source_refs_canonical_idx` ON `food_item_source_refs` (`source_kind`,`canonical_source_external_id`);--> statement-breakpoint
CREATE INDEX `food_item_source_refs_import_batch_idx` ON `food_item_source_refs` (`source_import_batch_id`);