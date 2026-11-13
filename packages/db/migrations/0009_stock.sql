CREATE TABLE `channel_stock_locations` (
	`channel_id` integer NOT NULL,
	`location_id` integer NOT NULL,
	`priority` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`channel_id`, `location_id`),
	FOREIGN KEY (`channel_id`) REFERENCES `channels`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`location_id`) REFERENCES `stock_locations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `stock_levels` (
	`variant_id` integer NOT NULL,
	`location_id` integer NOT NULL,
	`on_hand` integer DEFAULT 0 NOT NULL,
	`reserved` integer DEFAULT 0 NOT NULL,
	`safety` integer DEFAULT 0 NOT NULL,
	`version` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`variant_id`, `location_id`),
	FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`location_id`) REFERENCES `stock_locations`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "stock_levels_counts_ck" CHECK("stock_levels"."on_hand" >= 0 AND "stock_levels"."reserved" >= 0 AND "stock_levels"."safety" >= 0)
);
--> statement-breakpoint
CREATE TABLE `stock_locations` (
	`id` integer PRIMARY KEY NOT NULL,
	`public_id` text NOT NULL,
	`name` text NOT NULL,
	`address_line1` text,
	`address_line2` text,
	`city` text,
	`region` text,
	`district` text,
	`postal_code` text,
	`country_code` text,
	`active` integer DEFAULT true NOT NULL,
	`pickup_enabled` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT "stock_locations_country_ck" CHECK(length("stock_locations"."country_code") = 2)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `stock_locations_public_id_uq` ON `stock_locations` (`public_id`);--> statement-breakpoint
CREATE TABLE `stock_movements` (
	`id` integer PRIMARY KEY NOT NULL,
	`variant_id` integer NOT NULL,
	`sold_variant_id` integer,
	`location_id` integer NOT NULL,
	`kind` text NOT NULL,
	`quantity` integer NOT NULL,
	`units` integer NOT NULL,
	`ref_type` text,
	`ref_id` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`sold_variant_id`) REFERENCES `product_variants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`location_id`) REFERENCES `stock_locations`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "stock_movements_kind_ck" CHECK("stock_movements"."kind" IN ('adjustment', 'reservation', 'release', 'sale', 'return', 'transfer', 'erp_sync')),
	CONSTRAINT "stock_movements_ref_type_ck" CHECK("stock_movements"."ref_type" IN ('reservation', 'order', 'fulfillment', 'return', 'import', 'manual'))
);
--> statement-breakpoint
CREATE INDEX `stock_movements_level_idx` ON `stock_movements` (`variant_id`,`location_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `stock_movements_ref_idx` ON `stock_movements` (`ref_type`,`ref_id`);