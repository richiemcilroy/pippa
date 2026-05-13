CREATE TABLE `account` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`account_id` varchar(255) NOT NULL,
	`provider_id` varchar(64) NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`access_token_expires_at` datetime(3),
	`refresh_token_expires_at` datetime(3),
	`scope` varchar(512),
	`id_token` text,
	`password` text,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `account_id` PRIMARY KEY(`id`),
	CONSTRAINT `account_provider_account_uq` UNIQUE(`provider_id`,`account_id`)
);
--> statement-breakpoint
CREATE TABLE `session` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`token` varchar(255) NOT NULL,
	`expires_at` datetime(3) NOT NULL,
	`ip_address` varchar(45),
	`user_agent` varchar(512),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `session_id` PRIMARY KEY(`id`),
	CONSTRAINT `session_token_uq` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `user` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`public_id` varchar(32) NOT NULL,
	`name` varchar(191) NOT NULL DEFAULT '',
	`email` varchar(320) NOT NULL,
	`email_verified` boolean NOT NULL DEFAULT false,
	`image` varchar(1024),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `user_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_public_id_uq` UNIQUE(`public_id`),
	CONSTRAINT `user_email_uq` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `verification` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`identifier` varchar(255) NOT NULL,
	`value` varchar(255) NOT NULL,
	`expires_at` datetime(3) NOT NULL,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `verification_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `food_item_assets` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`food_item_id` bigint unsigned NOT NULL,
	`asset_kind` varchar(32) NOT NULL,
	`url` varchar(1024) NOT NULL,
	`source_key` varchar(512),
	`width` smallint unsigned,
	`height` smallint unsigned,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `food_item_assets_id` PRIMARY KEY(`id`),
	CONSTRAINT `food_item_assets_source_key_uq` UNIQUE(`source_key`)
);
--> statement-breakpoint
CREATE TABLE `food_item_details` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`food_item_id` bigint unsigned NOT NULL,
	`ingredients_text` text,
	`category_text` text,
	`category_tags` json,
	`label_tags` json,
	`allergen_tags` json,
	`trace_tags` json,
	`stores_text` text,
	`countries_tags` json,
	`nutriscore_grade` varchar(24),
	`nova_group` tinyint unsigned,
	`ecoscore_grade` varchar(24),
	`source_url` varchar(1024),
	`raw_source` json,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `food_item_details_id` PRIMARY KEY(`id`),
	CONSTRAINT `food_item_details_food_uq` UNIQUE(`food_item_id`)
);
--> statement-breakpoint
CREATE TABLE `food_items` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`public_id` varchar(32) NOT NULL,
	`source_kind` varchar(32) NOT NULL,
	`source_external_id` varchar(191),
	`owner_user_id` bigint unsigned,
	`visibility` varchar(16) NOT NULL DEFAULT 'public',
	`barcode` varchar(14),
	`name` varchar(255) NOT NULL,
	`brand_name` varchar(191),
	`name_sort_key` varchar(191) NOT NULL,
	`brand_sort_key` varchar(191),
	`search_text` text NOT NULL,
	`serving_size_text` varchar(128),
	`serving_quantity_centi_g` mediumint unsigned,
	`package_quantity_centi_g` mediumint unsigned,
	`energy_kcal_100g` smallint unsigned,
	`energy_kj_100g` smallint unsigned,
	`protein_100g_centi_g` smallint unsigned,
	`fibre_100g_centi_g` smallint unsigned,
	`fat_100g_centi_g` smallint unsigned,
	`saturated_fat_100g_centi_g` smallint unsigned,
	`carbs_100g_centi_g` smallint unsigned,
	`sugars_100g_centi_g` smallint unsigned,
	`salt_100g_mg` mediumint unsigned,
	`sodium_100g_mg` mediumint unsigned,
	`image_url` varchar(1024),
	`image_small_url` varchar(1024),
	`data_quality_score` tinyint unsigned NOT NULL DEFAULT 0,
	`popularity_score` int unsigned NOT NULL DEFAULT 0,
	`source_updated_at_epoch` int unsigned,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `food_items_id` PRIMARY KEY(`id`),
	CONSTRAINT `food_items_public_id_uq` UNIQUE(`public_id`),
	CONSTRAINT `food_items_barcode_uq` UNIQUE(`barcode`),
	CONSTRAINT `food_items_source_uq` UNIQUE(`source_kind`,`source_external_id`)
);
--> statement-breakpoint
CREATE TABLE `food_search_aliases` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`food_item_id` bigint unsigned NOT NULL,
	`locale` varchar(16) NOT NULL DEFAULT 'en-GB',
	`alias` varchar(255) NOT NULL,
	`alias_sort_key` varchar(191) NOT NULL,
	`weight` tinyint unsigned NOT NULL DEFAULT 1,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `food_search_aliases_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `saved_meal_items` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`saved_meal_id` bigint unsigned NOT NULL,
	`food_item_id` bigint unsigned,
	`source_kind` varchar(32) NOT NULL,
	`position` smallint unsigned NOT NULL,
	`item_name` varchar(255) NOT NULL,
	`serving_quantity_centi_g` mediumint unsigned,
	`unit` varchar(32) NOT NULL DEFAULT 'g',
	`energy_kcal` smallint unsigned,
	`protein_centi_g` smallint unsigned,
	`fibre_centi_g` smallint unsigned,
	`fat_centi_g` smallint unsigned,
	`carbs_centi_g` smallint unsigned,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `saved_meal_items_id` PRIMARY KEY(`id`),
	CONSTRAINT `saved_meal_items_meal_position_uq` UNIQUE(`saved_meal_id`,`position`)
);
--> statement-breakpoint
CREATE TABLE `saved_meals` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`public_id` varchar(32) NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`name` varchar(191) NOT NULL,
	`source_log_id` bigint unsigned,
	`total_energy_kcal` smallint unsigned,
	`total_protein_centi_g` smallint unsigned,
	`total_fibre_centi_g` smallint unsigned,
	`total_fat_centi_g` smallint unsigned,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `saved_meals_id` PRIMARY KEY(`id`),
	CONSTRAINT `saved_meals_public_id_uq` UNIQUE(`public_id`)
);
--> statement-breakpoint
CREATE TABLE `daily_nutrition_summaries` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`summary_date` date NOT NULL,
	`calorie_target` smallint unsigned,
	`calorie_lower_bound` smallint unsigned,
	`calorie_upper_bound` smallint unsigned,
	`energy_kcal` smallint unsigned NOT NULL DEFAULT 0,
	`protein_centi_g` smallint unsigned NOT NULL DEFAULT 0,
	`fibre_centi_g` smallint unsigned NOT NULL DEFAULT 0,
	`fat_centi_g` smallint unsigned NOT NULL DEFAULT 0,
	`carbs_centi_g` smallint unsigned NOT NULL DEFAULT 0,
	`meal_count` smallint unsigned NOT NULL DEFAULT 0,
	`logged_item_count` smallint unsigned NOT NULL DEFAULT 0,
	`target_profile_id` bigint unsigned,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `daily_nutrition_summaries_id` PRIMARY KEY(`id`),
	CONSTRAINT `daily_nutrition_user_date_uq` UNIQUE(`user_id`,`summary_date`)
);
--> statement-breakpoint
CREATE TABLE `food_estimates` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`public_id` varchar(32) NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`source_kind` varchar(32) NOT NULL,
	`status` varchar(32) NOT NULL DEFAULT 'draft',
	`confidence` tinyint unsigned,
	`model_version` varchar(64),
	`clarification_prompt` varchar(512),
	`estimate_payload` json,
	`photo_asset_key` varchar(512),
	`photo_retention_consent_id` bigint unsigned,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `food_estimates_id` PRIMARY KEY(`id`),
	CONSTRAINT `food_estimates_public_id_uq` UNIQUE(`public_id`)
);
--> statement-breakpoint
CREATE TABLE `meal_log_items` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`meal_log_id` bigint unsigned NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`log_date` date NOT NULL,
	`food_item_id` bigint unsigned,
	`saved_meal_id` bigint unsigned,
	`source_kind` varchar(32) NOT NULL,
	`position` smallint unsigned NOT NULL,
	`item_name` varchar(255) NOT NULL,
	`brand_name` varchar(191),
	`serving_quantity_centi_g` mediumint unsigned,
	`serving_unit` varchar(32) NOT NULL DEFAULT 'g',
	`serving_count_centi` mediumint unsigned,
	`energy_kcal` smallint unsigned,
	`protein_centi_g` smallint unsigned,
	`fibre_centi_g` smallint unsigned,
	`fat_centi_g` smallint unsigned,
	`saturated_fat_centi_g` smallint unsigned,
	`carbs_centi_g` smallint unsigned,
	`sugars_centi_g` smallint unsigned,
	`salt_mg` mediumint unsigned,
	`confidence` tinyint unsigned,
	`user_edited` tinyint unsigned NOT NULL DEFAULT 0,
	`edit_reason` varchar(64),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `meal_log_items_id` PRIMARY KEY(`id`),
	CONSTRAINT `meal_log_items_log_position_uq` UNIQUE(`meal_log_id`,`position`)
);
--> statement-breakpoint
CREATE TABLE `meal_logs` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`public_id` varchar(32) NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`logged_at` datetime(3) NOT NULL,
	`log_date` date NOT NULL,
	`meal_type` varchar(16) NOT NULL DEFAULT 'unspecified',
	`source_kind` varchar(32) NOT NULL,
	`food_estimate_id` bigint unsigned,
	`note` varchar(512),
	`deleted_at` datetime(3),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `meal_logs_id` PRIMARY KEY(`id`),
	CONSTRAINT `meal_logs_public_id_uq` UNIQUE(`public_id`)
);
--> statement-breakpoint
CREATE TABLE `user_food_recents` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`food_item_id` bigint unsigned NOT NULL,
	`last_meal_log_item_id` bigint unsigned,
	`last_logged_at` datetime(3) NOT NULL,
	`log_count` int unsigned NOT NULL DEFAULT 1,
	`typical_serving_quantity_centi_g` mediumint unsigned,
	`typical_serving_unit` varchar(32),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `user_food_recents_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_food_recents_user_food_uq` UNIQUE(`user_id`,`food_item_id`)
);
--> statement-breakpoint
CREATE TABLE `community_profiles` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`public_id` varchar(32) NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`display_name` varchar(64) NOT NULL,
	`avatar_url` varchar(1024),
	`bio` varchar(280),
	`consent_event_id` bigint unsigned,
	`disabled_at` datetime(3),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `community_profiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `community_profiles_public_id_uq` UNIQUE(`public_id`),
	CONSTRAINT `community_profiles_user_uq` UNIQUE(`user_id`),
	CONSTRAINT `community_profiles_display_name_uq` UNIQUE(`display_name`)
);
--> statement-breakpoint
CREATE TABLE `consent_events` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`consent_kind` varchar(40) NOT NULL,
	`status` varchar(16) NOT NULL,
	`policy_version` varchar(64),
	`source` varchar(64) NOT NULL,
	`metadata` json,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `consent_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `daily_insights` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`insight_date` date NOT NULL,
	`insight_kind` varchar(32) NOT NULL,
	`content_key` varchar(128) NOT NULL,
	`cycle_context` varchar(64),
	`rationale` varchar(512),
	`payload` json,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `daily_insights_id` PRIMARY KEY(`id`),
	CONSTRAINT `daily_insights_user_date_kind_uq` UNIQUE(`user_id`,`insight_date`,`insight_kind`)
);
--> statement-breakpoint
CREATE TABLE `privacy_settings` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`calorie_visibility` varchar(16) NOT NULL DEFAULT 'visible',
	`default_share_calories` tinyint unsigned NOT NULL DEFAULT 0,
	`default_share_protein` tinyint unsigned NOT NULL DEFAULT 1,
	`default_share_fibre` tinyint unsigned NOT NULL DEFAULT 1,
	`default_share_fat` tinyint unsigned NOT NULL DEFAULT 0,
	`analytics_health_data_allowed` tinyint unsigned NOT NULL DEFAULT 0,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `privacy_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `privacy_settings_user_uq` UNIQUE(`user_id`)
);
--> statement-breakpoint
CREATE TABLE `safety_events` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`event_kind` varchar(40) NOT NULL,
	`severity` tinyint unsigned NOT NULL DEFAULT 1,
	`context` text,
	`resolved_at` datetime(3),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `safety_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `share_cards` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`public_id` varchar(32) NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`card_kind` varchar(32) NOT NULL,
	`meal_log_id` bigint unsigned,
	`week_start_on` date,
	`title` varchar(191),
	`body` varchar(512),
	`show_calories` tinyint unsigned NOT NULL DEFAULT 0,
	`show_protein` tinyint unsigned NOT NULL DEFAULT 1,
	`show_fibre` tinyint unsigned NOT NULL DEFAULT 1,
	`show_fat` tinyint unsigned NOT NULL DEFAULT 0,
	`show_weight` tinyint unsigned NOT NULL DEFAULT 0,
	`image_asset_key` varchar(512),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `share_cards_id` PRIMARY KEY(`id`),
	CONSTRAINT `share_cards_public_id_uq` UNIQUE(`public_id`)
);
--> statement-breakpoint
CREATE TABLE `cycle_entries` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`entry_on` date NOT NULL,
	`source` varchar(24) NOT NULL DEFAULT 'manual',
	`is_period_day` tinyint unsigned NOT NULL DEFAULT 0,
	`flow_level` tinyint unsigned,
	`hunger_level` tinyint unsigned,
	`craving_level` tinyint unsigned,
	`energy_level` tinyint unsigned,
	`mood_level` tinyint unsigned,
	`bloating_level` tinyint unsigned,
	`notes` varchar(512),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `cycle_entries_id` PRIMARY KEY(`id`),
	CONSTRAINT `cycle_entries_user_day_uq` UNIQUE(`user_id`,`entry_on`)
);
--> statement-breakpoint
CREATE TABLE `cycle_profiles` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`last_period_start_on` date,
	`average_cycle_length_days` tinyint unsigned,
	`period_length_days` tinyint unsigned,
	`regularity` varchar(16) NOT NULL DEFAULT 'unknown',
	`source` varchar(24) NOT NULL DEFAULT 'manual',
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `cycle_profiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `cycle_profiles_user_uq` UNIQUE(`user_id`)
);
--> statement-breakpoint
CREATE TABLE `private_profiles` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`status` varchar(24) NOT NULL DEFAULT 'onboarding',
	`timezone` varchar(64) NOT NULL DEFAULT 'Europe/London',
	`locale` varchar(16) NOT NULL DEFAULT 'en-GB',
	`age_range` varchar(24),
	`height_mm` smallint unsigned,
	`latest_weight_g` int unsigned,
	`goal_direction` varchar(16) NOT NULL DEFAULT 'lose',
	`goal_intensity` tinyint unsigned,
	`goal_weight_g` int unsigned,
	`activity_level` varchar(24) NOT NULL DEFAULT 'light',
	`cardio_sessions_per_week` tinyint unsigned,
	`strength_sessions_per_week` tinyint unsigned,
	`dietary_preference_tags` json,
	`calorie_visibility` varchar(16) NOT NULL DEFAULT 'visible',
	`onboarding_completed_at` datetime(3),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `private_profiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `private_profiles_user_uq` UNIQUE(`user_id`)
);
--> statement-breakpoint
CREATE TABLE `target_profiles` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`effective_from` date NOT NULL,
	`effective_to` date,
	`calculation_version` varchar(32) NOT NULL,
	`calculation_reason` varchar(32) NOT NULL,
	`calorie_target` smallint unsigned NOT NULL,
	`calorie_lower_bound` smallint unsigned NOT NULL,
	`calorie_upper_bound` smallint unsigned NOT NULL,
	`activity_adjustment_kcal` smallint NOT NULL DEFAULT 0,
	`protein_target_centi_g` smallint unsigned NOT NULL,
	`fibre_target_centi_g` smallint unsigned NOT NULL,
	`fat_target_centi_g` smallint unsigned NOT NULL,
	`carbs_target_centi_g` smallint unsigned,
	`safety_floor_applied` tinyint unsigned NOT NULL DEFAULT 0,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `target_profiles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `weight_entries` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`logged_on` date NOT NULL,
	`weight_g` int unsigned NOT NULL,
	`source` varchar(32) NOT NULL DEFAULT 'manual',
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `weight_entries_id` PRIMARY KEY(`id`),
	CONSTRAINT `weight_entries_user_day_uq` UNIQUE(`user_id`,`logged_on`)
);
--> statement-breakpoint
CREATE INDEX `account_user_idx` ON `account` (`user_id`);--> statement-breakpoint
CREATE INDEX `session_user_expires_idx` ON `session` (`user_id`,`expires_at`);--> statement-breakpoint
CREATE INDEX `session_expires_idx` ON `session` (`expires_at`);--> statement-breakpoint
CREATE INDEX `verification_identifier_expires_idx` ON `verification` (`identifier`,`expires_at`);--> statement-breakpoint
CREATE INDEX `verification_expires_idx` ON `verification` (`expires_at`);--> statement-breakpoint
CREATE INDEX `food_item_assets_food_kind_idx` ON `food_item_assets` (`food_item_id`,`asset_kind`);--> statement-breakpoint
CREATE INDEX `food_items_name_prefix_idx` ON `food_items` (`name_sort_key`,`brand_sort_key`);--> statement-breakpoint
CREATE INDEX `food_items_owner_updated_idx` ON `food_items` (`owner_user_id`,`updated_at`);--> statement-breakpoint
CREATE INDEX `food_items_visibility_quality_idx` ON `food_items` (`visibility`,`data_quality_score`,`popularity_score`);--> statement-breakpoint
CREATE INDEX `food_search_aliases_prefix_idx` ON `food_search_aliases` (`alias_sort_key`,`weight`);--> statement-breakpoint
CREATE INDEX `food_search_aliases_food_idx` ON `food_search_aliases` (`food_item_id`);--> statement-breakpoint
CREATE INDEX `saved_meal_items_food_idx` ON `saved_meal_items` (`food_item_id`);--> statement-breakpoint
CREATE INDEX `saved_meals_user_updated_idx` ON `saved_meals` (`user_id`,`updated_at`);--> statement-breakpoint
CREATE INDEX `food_estimates_user_status_idx` ON `food_estimates` (`user_id`,`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `meal_log_items_user_day_idx` ON `meal_log_items` (`user_id`,`log_date`);--> statement-breakpoint
CREATE INDEX `meal_log_items_food_recent_idx` ON `meal_log_items` (`food_item_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `meal_logs_user_day_idx` ON `meal_logs` (`user_id`,`log_date`,`logged_at`);--> statement-breakpoint
CREATE INDEX `meal_logs_user_recent_idx` ON `meal_logs` (`user_id`,`logged_at`);--> statement-breakpoint
CREATE INDEX `user_food_recents_user_recent_idx` ON `user_food_recents` (`user_id`,`last_logged_at`);--> statement-breakpoint
CREATE INDEX `consent_events_user_kind_recent_idx` ON `consent_events` (`user_id`,`consent_kind`,`created_at`);--> statement-breakpoint
CREATE INDEX `safety_events_user_recent_idx` ON `safety_events` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `safety_events_kind_severity_idx` ON `safety_events` (`event_kind`,`severity`,`created_at`);--> statement-breakpoint
CREATE INDEX `share_cards_user_recent_idx` ON `share_cards` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `share_cards_meal_idx` ON `share_cards` (`meal_log_id`);--> statement-breakpoint
CREATE INDEX `target_profiles_user_current_idx` ON `target_profiles` (`user_id`,`effective_to`,`effective_from`);--> statement-breakpoint
CREATE INDEX `target_profiles_user_history_idx` ON `target_profiles` (`user_id`,`effective_from`);--> statement-breakpoint
ALTER TABLE `food_items`
  ADD FULLTEXT INDEX `food_items_search_fulltext_idx` (`name`, `brand_name`, `search_text`);
