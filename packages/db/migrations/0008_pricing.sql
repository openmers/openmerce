CREATE TABLE `currency_rates` (
	`day` text NOT NULL,
	`base` text NOT NULL,
	`quote` text NOT NULL,
	`rate_e9` integer NOT NULL,
	`source` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`day`, `base`, `quote`),
	CONSTRAINT "currency_rates_day_ck" CHECK("currency_rates"."day" GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
	CONSTRAINT "currency_rates_pair_ck" CHECK(length("currency_rates"."base") = 3 AND length("currency_rates"."quote") = 3 AND "currency_rates"."base" <> "currency_rates"."quote"),
	CONSTRAINT "currency_rates_rate_ck" CHECK(typeof("currency_rates"."rate_e9") = 'integer' AND "currency_rates"."rate_e9" > 0)
);
--> statement-breakpoint
CREATE INDEX `currency_rates_pair_idx` ON `currency_rates` (`base`,`quote`,`day`);--> statement-breakpoint
CREATE TABLE `price_list_targets` (
	`id` integer PRIMARY KEY NOT NULL,
	`price_list_id` integer NOT NULL,
	`customer_group_id` integer,
	`company_id` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`price_list_id`) REFERENCES `price_lists`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "price_list_targets_target_ck" CHECK("price_list_targets"."customer_group_id" IS NULL OR "price_list_targets"."company_id" IS NULL)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `price_list_targets_uq` ON `price_list_targets` (`price_list_id`,ifnull(`customer_group_id`, 0),ifnull(`company_id`, 0));--> statement-breakpoint
CREATE INDEX `price_list_targets_group_idx` ON `price_list_targets` (`customer_group_id`);--> statement-breakpoint
CREATE INDEX `price_list_targets_company_idx` ON `price_list_targets` (`company_id`);--> statement-breakpoint
CREATE TABLE `price_lists` (
	`id` integer PRIMARY KEY NOT NULL,
	`public_id` text NOT NULL,
	`name` text NOT NULL,
	`channel_id` integer NOT NULL,
	`currency` text NOT NULL,
	`type` text NOT NULL,
	`priority` integer NOT NULL,
	`starts_at` integer,
	`ends_at` integer,
	`includes_tax` integer NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`fx_source_price_list_id` integer,
	`fx_rounding` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`channel_id`) REFERENCES `channels`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`fx_source_price_list_id`) REFERENCES `price_lists`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "price_lists_currency_ck" CHECK(length("price_lists"."currency") = 3),
	CONSTRAINT "price_lists_type_ck" CHECK("price_lists"."type" IN ('base', 'sale', 'contract')),
	CONSTRAINT "price_lists_status_ck" CHECK("price_lists"."status" IN ('active', 'expired'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `price_lists_public_id_uq` ON `price_lists` (`public_id`);--> statement-breakpoint
CREATE INDEX `price_lists_channel_type_idx` ON `price_lists` (`channel_id`,`type`);--> statement-breakpoint
CREATE UNIQUE INDEX `price_lists_base_uq` ON `price_lists` (`channel_id`,`currency`) WHERE "price_lists"."type" = 'base';--> statement-breakpoint
CREATE INDEX `price_lists_fx_source_idx` ON `price_lists` (`fx_source_price_list_id`);--> statement-breakpoint
CREATE TABLE `prices` (
	`price_list_id` integer NOT NULL,
	`variant_id` integer NOT NULL,
	`min_qty` integer DEFAULT 1 NOT NULL,
	`amount` integer NOT NULL,
	`compare_at_amount` integer,
	`currency` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`price_list_id`, `variant_id`, `min_qty`),
	FOREIGN KEY (`price_list_id`) REFERENCES `price_lists`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "prices_min_qty_ck" CHECK("prices"."min_qty" >= 1),
	CONSTRAINT "prices_amount_ck" CHECK(typeof("prices"."amount") = 'integer' AND "prices"."amount" >= 0),
	CONSTRAINT "prices_compare_at_amount_ck" CHECK(typeof("prices"."compare_at_amount") IN ('integer', 'null') AND "prices"."compare_at_amount" >= 0),
	CONSTRAINT "prices_currency_ck" CHECK(length("prices"."currency") = 3)
);
--> statement-breakpoint
ALTER TABLE `channels` ADD `default_price_list_id` integer REFERENCES price_lists(id);