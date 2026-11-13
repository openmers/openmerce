CREATE TABLE `shipping_methods` (
	`id` integer PRIMARY KEY NOT NULL,
	`public_id` text NOT NULL,
	`name` text NOT NULL,
	`zone_id` integer,
	`checker_code` text,
	`checker_args` text,
	`calculator_code` text NOT NULL,
	`calculator_args` text NOT NULL,
	`tax_category_id` integer NOT NULL,
	`pickup_location_id` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`zone_id`) REFERENCES `zones`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`tax_category_id`) REFERENCES `tax_categories`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`pickup_location_id`) REFERENCES `stock_locations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `shipping_methods_public_id_uq` ON `shipping_methods` (`public_id`);--> statement-breakpoint
CREATE TABLE `tax_categories` (
	`id` integer PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tax_categories_code_uq` ON `tax_categories` (`code`);--> statement-breakpoint
CREATE TABLE `tax_rates` (
	`id` integer PRIMARY KEY NOT NULL,
	`public_id` text NOT NULL,
	`zone_id` integer NOT NULL,
	`tax_category_id` integer NOT NULL,
	`customer_group_id` integer,
	`rate_bp` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`zone_id`) REFERENCES `zones`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`tax_category_id`) REFERENCES `tax_categories`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "tax_rates_rate_ck" CHECK(typeof("tax_rates"."rate_bp") = 'integer' AND "tax_rates"."rate_bp" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tax_rates_public_id_uq` ON `tax_rates` (`public_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `tax_rates_uq` ON `tax_rates` (`zone_id`,`tax_category_id`,coalesce(`customer_group_id`, 0));--> statement-breakpoint
CREATE TABLE `zone_members` (
	`zone_id` integer NOT NULL,
	`country` text NOT NULL,
	`region` text,
	FOREIGN KEY (`zone_id`) REFERENCES `zones`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "zone_members_country_ck" CHECK(length("zone_members"."country") = 2)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `zone_members_uq` ON `zone_members` (`zone_id`,`country`,coalesce(`region`, ''));--> statement-breakpoint
CREATE TABLE `zones` (
	`id` integer PRIMARY KEY NOT NULL,
	`public_id` text NOT NULL,
	`name` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `zones_public_id_uq` ON `zones` (`public_id`);--> statement-breakpoint
ALTER TABLE `channels` ADD `default_tax_zone_id` integer REFERENCES zones(id);--> statement-breakpoint
ALTER TABLE `channels` ADD `default_shipping_zone_id` integer REFERENCES zones(id);