CREATE TABLE `collection_channels` (
	`collection_id` integer NOT NULL,
	`channel_id` integer NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`collection_id`, `channel_id`),
	FOREIGN KEY (`collection_id`) REFERENCES `collections`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`channel_id`) REFERENCES `channels`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `collection_channels_channel_idx` ON `collection_channels` (`channel_id`,`collection_id`);--> statement-breakpoint
CREATE TABLE `collection_translations` (
	`collection_id` integer NOT NULL,
	`lang` text NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`description` text,
	`seo_title` text,
	`seo_description` text,
	`social` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`collection_id`, `lang`),
	FOREIGN KEY (`collection_id`) REFERENCES `collections`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `collection_translations_slug_uq` ON `collection_translations` (`lang`,`slug`);--> statement-breakpoint
CREATE TABLE `collection_variants` (
	`collection_id` integer NOT NULL,
	`variant_id` integer NOT NULL,
	PRIMARY KEY(`collection_id`, `variant_id`),
	FOREIGN KEY (`collection_id`) REFERENCES `collections`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `collection_variants_variant_idx` ON `collection_variants` (`variant_id`);--> statement-breakpoint
CREATE TABLE `collections` (
	`id` integer PRIMARY KEY NOT NULL,
	`public_id` text NOT NULL,
	`parent_id` integer,
	`position` integer NOT NULL,
	`filters` text,
	`inherit_filters` integer DEFAULT true NOT NULL,
	`indexable_filters` text,
	`robots` text,
	`version` integer DEFAULT 0 NOT NULL,
	`deleted_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`parent_id`) REFERENCES `collections`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `collections_public_id_uq` ON `collections` (`public_id`);--> statement-breakpoint
CREATE INDEX `collections_parent_idx` ON `collections` (`parent_id`,`position`);--> statement-breakpoint
CREATE TABLE `facet_translations` (
	`facet_id` integer NOT NULL,
	`lang` text NOT NULL,
	`name` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`facet_id`, `lang`),
	FOREIGN KEY (`facet_id`) REFERENCES `facets`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `facet_value_translations` (
	`facet_value_id` integer NOT NULL,
	`lang` text NOT NULL,
	`name` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`facet_value_id`, `lang`),
	FOREIGN KEY (`facet_value_id`) REFERENCES `facet_values`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `facet_values` (
	`id` integer PRIMARY KEY NOT NULL,
	`facet_id` integer NOT NULL,
	`code` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`facet_id`) REFERENCES `facets`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `facet_values_code_uq` ON `facet_values` (`facet_id`,`code`);--> statement-breakpoint
CREATE TABLE `facets` (
	`id` integer PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`private` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `facets_code_uq` ON `facets` (`code`);--> statement-breakpoint
CREATE TABLE `product_facet_values` (
	`product_id` integer NOT NULL,
	`facet_value_id` integer NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`product_id`, `facet_value_id`),
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`facet_value_id`) REFERENCES `facet_values`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `product_facet_values_value_idx` ON `product_facet_values` (`facet_value_id`,`product_id`);--> statement-breakpoint
CREATE TABLE `variant_facet_values` (
	`variant_id` integer NOT NULL,
	`facet_value_id` integer NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`variant_id`, `facet_value_id`),
	FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`facet_value_id`) REFERENCES `facet_values`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `variant_facet_values_value_idx` ON `variant_facet_values` (`facet_value_id`,`variant_id`);--> statement-breakpoint
CREATE TABLE `option_value_translations` (
	`option_value_id` integer NOT NULL,
	`lang` text NOT NULL,
	`name` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`option_value_id`, `lang`),
	FOREIGN KEY (`option_value_id`) REFERENCES `option_values`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `option_values` (
	`id` integer PRIMARY KEY NOT NULL,
	`option_id` integer NOT NULL,
	`code` text NOT NULL,
	`position` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`option_id`) REFERENCES `product_options`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `option_values_code_uq` ON `option_values` (`option_id`,`code`);--> statement-breakpoint
CREATE INDEX `option_values_position_idx` ON `option_values` (`option_id`,`position`);--> statement-breakpoint
CREATE UNIQUE INDEX `option_values_id_option_uq` ON `option_values` (`id`,`option_id`);--> statement-breakpoint
CREATE TABLE `product_assets` (
	`id` integer PRIMARY KEY NOT NULL,
	`product_id` integer NOT NULL,
	`variant_id` integer,
	`option_value_id` integer,
	`asset_id` integer NOT NULL,
	`position` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`option_value_id`) REFERENCES `option_values`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`asset_id`) REFERENCES `media`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "product_assets_level_ck" CHECK("product_assets"."variant_id" IS NULL OR "product_assets"."option_value_id" IS NULL)
);
--> statement-breakpoint
CREATE INDEX `product_assets_product_idx` ON `product_assets` (`product_id`,`position`);--> statement-breakpoint
CREATE INDEX `product_assets_asset_idx` ON `product_assets` (`asset_id`);--> statement-breakpoint
CREATE TABLE `product_option_translations` (
	`option_id` integer NOT NULL,
	`lang` text NOT NULL,
	`name` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`option_id`, `lang`),
	FOREIGN KEY (`option_id`) REFERENCES `product_options`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `product_options` (
	`id` integer PRIMARY KEY NOT NULL,
	`product_id` integer NOT NULL,
	`code` text NOT NULL,
	`position` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `product_options_code_uq` ON `product_options` (`product_id`,`code`);--> statement-breakpoint
CREATE INDEX `product_options_position_idx` ON `product_options` (`product_id`,`position`);--> statement-breakpoint
CREATE TABLE `variant_option_values` (
	`variant_id` integer NOT NULL,
	`option_id` integer NOT NULL,
	`option_value_id` integer NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`variant_id`, `option_value_id`),
	FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`option_id`) REFERENCES `product_options`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`option_value_id`,`option_id`) REFERENCES `option_values`(`id`,`option_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `variant_option_values_option_uq` ON `variant_option_values` (`variant_id`,`option_id`);--> statement-breakpoint
CREATE INDEX `variant_option_values_value_idx` ON `variant_option_values` (`option_value_id`,`variant_id`);--> statement-breakpoint
CREATE TABLE `product_channels` (
	`product_id` integer NOT NULL,
	`channel_id` integer NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`product_id`, `channel_id`),
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`channel_id`) REFERENCES `channels`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `product_channels_channel_idx` ON `product_channels` (`channel_id`,`product_id`);--> statement-breakpoint
CREATE TABLE `product_translations` (
	`id` integer PRIMARY KEY NOT NULL,
	`product_id` integer NOT NULL,
	`lang` text NOT NULL,
	`channel_id` integer,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`description` text,
	`seo_title` text,
	`seo_description` text,
	`social` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`channel_id`) REFERENCES `channels`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `product_translations_uq` ON `product_translations` (`product_id`,`lang`,ifnull(`channel_id`, 0));--> statement-breakpoint
CREATE UNIQUE INDEX `product_translations_slug_uq` ON `product_translations` (`lang`,`slug`);--> statement-breakpoint
CREATE TABLE `product_variants` (
	`id` integer PRIMARY KEY NOT NULL,
	`public_id` text NOT NULL,
	`product_id` integer NOT NULL,
	`sku` text NOT NULL,
	`barcode` text,
	`weight` integer,
	`length` integer,
	`width` integer,
	`height` integer,
	`tax_category_id` integer NOT NULL,
	`track_inventory` integer DEFAULT true NOT NULL,
	`allow_backorder` integer DEFAULT false NOT NULL,
	`backorder_floor` integer,
	`min_order_qty` integer,
	`order_multiple` integer,
	`fulfillment_type` text DEFAULT 'physical' NOT NULL,
	`lead_time_days` integer,
	`personalization` text,
	`base_variant_id` integer,
	`unit_factor` integer DEFAULT 1 NOT NULL,
	`withdrawal_exempt_kind` text,
	`custom_fields` text,
	`metadata` text,
	`private_metadata` text,
	`version` integer DEFAULT 0 NOT NULL,
	`deleted_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`tax_category_id`) REFERENCES `tax_categories`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`base_variant_id`) REFERENCES `product_variants`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "product_variants_unit_factor_ck" CHECK("product_variants"."unit_factor" >= 1),
	CONSTRAINT "product_variants_fulfillment_type_ck" CHECK("product_variants"."fulfillment_type" IN ('physical', 'digital')),
	CONSTRAINT "product_variants_backorder_floor_ck" CHECK("product_variants"."backorder_floor" <= 0),
	CONSTRAINT "product_variants_base_ck" CHECK("product_variants"."base_variant_id" <> "product_variants"."id")
);
--> statement-breakpoint
CREATE UNIQUE INDEX `product_variants_public_id_uq` ON `product_variants` (`public_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `product_variants_sku_uq` ON `product_variants` (`sku`) WHERE "product_variants"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX `product_variants_product_idx` ON `product_variants` (`product_id`);--> statement-breakpoint
CREATE INDEX `product_variants_base_idx` ON `product_variants` (`base_variant_id`);--> statement-breakpoint
CREATE TABLE `products` (
	`id` integer PRIMARY KEY NOT NULL,
	`public_id` text NOT NULL,
	`personalization` text,
	`withdrawal_exempt_kind` text,
	`robots` text,
	`content_hash` text,
	`custom_fields` text,
	`metadata` text,
	`private_metadata` text,
	`version` integer DEFAULT 0 NOT NULL,
	`deleted_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `products_public_id_uq` ON `products` (`public_id`);--> statement-breakpoint
CREATE INDEX `products_deleted_updated_idx` ON `products` (`deleted_at`,`updated_at`);--> statement-breakpoint
CREATE TABLE `variant_channels` (
	`variant_id` integer NOT NULL,
	`channel_id` integer NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`variant_id`, `channel_id`),
	FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`channel_id`) REFERENCES `channels`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `variant_channels_channel_idx` ON `variant_channels` (`channel_id`,`variant_id`);