CREATE TABLE `cart_lines` (
	`id` integer PRIMARY KEY NOT NULL,
	`cart_id` integer NOT NULL,
	`variant_id` integer NOT NULL,
	`quantity` integer NOT NULL,
	`custom_fields` text,
	`personalization` text,
	`line_key` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`cart_id`) REFERENCES `carts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "cart_lines_quantity_ck" CHECK("cart_lines"."quantity" > 0),
	CONSTRAINT "cart_lines_line_key_ck" CHECK(length("cart_lines"."line_key") IN (0, 32) AND "cart_lines"."line_key" NOT GLOB '*[^0-9a-f]*')
);
--> statement-breakpoint
CREATE UNIQUE INDEX `cart_lines_uq` ON `cart_lines` (`cart_id`,`variant_id`,`line_key`);--> statement-breakpoint
CREATE TABLE `carts` (
	`id` integer PRIMARY KEY NOT NULL,
	`public_id` text NOT NULL,
	`channel_id` integer NOT NULL,
	`customer_id` integer,
	`company_id` integer,
	`name` text,
	`status` text DEFAULT 'active' NOT NULL,
	`currency` text NOT NULL,
	`shipping_address` text,
	`billing_address` text,
	`shipping_method_id` integer,
	`coupon_codes` text,
	`email` text,
	`version` integer DEFAULT 0 NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`channel_id`) REFERENCES `channels`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`shipping_method_id`) REFERENCES `shipping_methods`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "carts_status_ck" CHECK("carts"."status" IN ('active', 'awaiting_approval', 'closed')),
	CONSTRAINT "carts_currency_ck" CHECK(length("carts"."currency") = 3)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `carts_public_id_uq` ON `carts` (`public_id`);--> statement-breakpoint
CREATE INDEX `carts_customer_status_idx` ON `carts` (`customer_id`,`status`);--> statement-breakpoint
CREATE INDEX `carts_company_status_idx` ON `carts` (`company_id`,`status`);--> statement-breakpoint
CREATE INDEX `carts_expires_idx` ON `carts` (`expires_at`);--> statement-breakpoint
CREATE TABLE `checkout_reservations` (
	`id` integer PRIMARY KEY NOT NULL,
	`public_id` text NOT NULL,
	`cart_id` integer NOT NULL,
	`channel_id` integer NOT NULL,
	`snapshot` text NOT NULL,
	`payment_method_id` integer NOT NULL,
	`status` text NOT NULL,
	`expires_at` integer NOT NULL,
	`source` text DEFAULT 'web' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`channel_id`) REFERENCES `channels`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`payment_method_id`) REFERENCES `payment_methods`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "checkout_reservations_status_ck" CHECK("checkout_reservations"."status" IN ('active', 'payment_pending', 'settled', 'released', 'expired', 'failed')),
	CONSTRAINT "checkout_reservations_source_ck" CHECK("checkout_reservations"."source" IN ('web', 'agent', 'admin', 'api')),
	CONSTRAINT "checkout_reservations_snapshot_ck" CHECK(json_type("checkout_reservations"."snapshot") = 'object')
);
--> statement-breakpoint
CREATE UNIQUE INDEX `checkout_reservations_public_id_uq` ON `checkout_reservations` (`public_id`);--> statement-breakpoint
CREATE INDEX `checkout_reservations_open_idx` ON `checkout_reservations` (`status`,`expires_at`) WHERE "checkout_reservations"."status" IN ('active', 'payment_pending');--> statement-breakpoint
CREATE INDEX `checkout_reservations_cart_idx` ON `checkout_reservations` (`cart_id`);--> statement-breakpoint
CREATE INDEX `checkout_reservations_purge_idx` ON `checkout_reservations` (`status`,`updated_at`);