CREATE TABLE `catalog_index` (
	`channel_id` integer NOT NULL,
	`lang` text NOT NULL,
	`variant_id` integer NOT NULL,
	`product_id` integer NOT NULL,
	`product_public_id` text NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`sku` text NOT NULL,
	`thumb` text,
	`collection_ids` text,
	`facet_value_ids` text,
	`price_min` integer,
	`price_max` integer,
	`currency` text NOT NULL,
	`stock_bucket` text NOT NULL,
	`lead_time_days` integer,
	`sort_name` text NOT NULL,
	`created_at` integer NOT NULL,
	`sales_rank` integer,
	`group_first` integer NOT NULL,
	PRIMARY KEY(`channel_id`, `lang`, `variant_id`),
	CONSTRAINT "catalog_index_stock_bucket_ck" CHECK("catalog_index"."stock_bucket" IN ('out', 'low', 'in_stock')),
	CONSTRAINT "catalog_index_currency_ck" CHECK(length("catalog_index"."currency") = 3)
);
--> statement-breakpoint
CREATE INDEX `catalog_index_name_idx` ON `catalog_index` (`channel_id`,`lang`,`group_first`,`sort_name`,`variant_id`);--> statement-breakpoint
CREATE INDEX `catalog_index_created_idx` ON `catalog_index` (`channel_id`,`lang`,`group_first`,`created_at`,`variant_id`);--> statement-breakpoint
CREATE INDEX `catalog_index_price_idx` ON `catalog_index` (`channel_id`,`lang`,`group_first`,`price_min`,`variant_id`);--> statement-breakpoint
CREATE INDEX `catalog_index_sales_idx` ON `catalog_index` (`channel_id`,`lang`,`group_first`,`sales_rank`,`variant_id`);--> statement-breakpoint
CREATE INDEX `catalog_index_product_idx` ON `catalog_index` (`product_id`);--> statement-breakpoint
CREATE TABLE `catalog_index_collections` (
	`channel_id` integer NOT NULL,
	`collection_id` integer NOT NULL,
	`variant_id` integer NOT NULL,
	PRIMARY KEY(`channel_id`, `collection_id`, `variant_id`)
) WITHOUT ROWID;
--> statement-breakpoint
CREATE TABLE `catalog_index_facets` (
	`channel_id` integer NOT NULL,
	`facet_value_id` integer NOT NULL,
	`variant_id` integer NOT NULL,
	PRIMARY KEY(`channel_id`, `facet_value_id`, `variant_id`)
) WITHOUT ROWID;
--> statement-breakpoint
CREATE TABLE `customer_spend` (
	`customer_id` integer NOT NULL,
	`currency` text NOT NULL,
	`total_paid` integer NOT NULL,
	`total_refunded` integer NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`customer_id`, `currency`),
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "customer_spend_currency_ck" CHECK(length("customer_spend"."currency") = 3)
);
--> statement-breakpoint
CREATE INDEX `customer_spend_net_idx` ON `customer_spend` (`currency`,("total_paid" - "total_refunded"));--> statement-breakpoint
CREATE TABLE `customer_stats` (
	`customer_id` integer PRIMARY KEY NOT NULL,
	`orders_count` integer NOT NULL,
	`paid_orders_count` integer NOT NULL,
	`first_order_at` integer,
	`last_order_at` integer,
	`last_seen_at` integer,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `customer_stats_last_order_idx` ON `customer_stats` (`last_order_at`);--> statement-breakpoint
CREATE INDEX `customer_stats_orders_count_idx` ON `customer_stats` (`orders_count`);--> statement-breakpoint
CREATE TABLE `product_view` (
	`channel_id` integer NOT NULL,
	`lang` text NOT NULL,
	`slug` text NOT NULL,
	`product_id` integer NOT NULL,
	`data` text NOT NULL,
	PRIMARY KEY(`channel_id`, `lang`, `slug`)
);
--> statement-breakpoint
CREATE INDEX `product_view_product_idx` ON `product_view` (`product_id`);--> statement-breakpoint
-- hand-written: FTS5 virtual tables are not expressible in Drizzle; text is folded by the app, so the tokenizer is language independent
CREATE VIRTUAL TABLE `catalog_fts` USING fts5(`name`, `sku`, `facet_text`, `description_excerpt`, tokenize = 'unicode61 remove_diacritics 0');--> statement-breakpoint
CREATE VIRTUAL TABLE `customer_search` USING fts5(`email`, `name`, `phone_digits`, `company_name`, `phone_reversed`, tokenize = 'unicode61 remove_diacritics 0');
