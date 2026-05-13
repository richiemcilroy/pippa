DROP INDEX `food_search_aliases_prefix_idx` ON `food_search_aliases`;--> statement-breakpoint
DROP INDEX `meal_log_items_user_day_idx` ON `meal_log_items`;--> statement-breakpoint
DROP INDEX `meal_logs_user_day_idx` ON `meal_logs`;--> statement-breakpoint
DROP INDEX `meal_logs_user_recent_idx` ON `meal_logs`;--> statement-breakpoint
DROP INDEX `user_food_recents_user_recent_idx` ON `user_food_recents`;--> statement-breakpoint
ALTER TABLE `saved_meals` ADD `name_sort_key` varchar(191) NOT NULL;--> statement-breakpoint
CREATE INDEX `food_items_owner_name_idx` ON `food_items` (`owner_user_id`,`name_sort_key`,`brand_sort_key`);--> statement-breakpoint
CREATE INDEX `food_search_aliases_locale_prefix_idx` ON `food_search_aliases` (`locale`,`alias_sort_key`,`weight`);--> statement-breakpoint
CREATE INDEX `saved_meals_user_name_idx` ON `saved_meals` (`user_id`,`name_sort_key`);--> statement-breakpoint
CREATE INDEX `meal_log_items_user_day_meal_idx` ON `meal_log_items` (`user_id`,`log_date`,`meal_log_id`,`position`);--> statement-breakpoint
CREATE INDEX `meal_logs_user_day_active_idx` ON `meal_logs` (`user_id`,`log_date`,`deleted_at`,`logged_at`);--> statement-breakpoint
CREATE INDEX `meal_logs_user_recent_active_idx` ON `meal_logs` (`user_id`,`deleted_at`,`logged_at`);--> statement-breakpoint
CREATE INDEX `user_food_recents_user_recent_idx` ON `user_food_recents` (`user_id`,`last_logged_at`,`food_item_id`);