CREATE TABLE `order_adjustments` (
	`id` integer PRIMARY KEY NOT NULL,
	`order_id` integer NOT NULL,
	`order_line_id` integer,
	`source` text NOT NULL,
	`promotion_id` integer,
	`amount` integer NOT NULL,
	`target` text NOT NULL,
	`description` text,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`order_line_id`) REFERENCES `order_lines`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`promotion_id`) REFERENCES `promotions`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "order_adjustments_source_ck" CHECK("order_adjustments"."source" IN ('promotion', 'coupon', 'manual')),
	CONSTRAINT "order_adjustments_target_ck" CHECK("order_adjustments"."target" IN ('line', 'order', 'shipping')),
	CONSTRAINT "order_adjustments_line_ck" CHECK(("order_adjustments"."target" = 'line') = ("order_adjustments"."order_line_id" IS NOT NULL)),
	CONSTRAINT "order_adjustments_amount_ck" CHECK(typeof("order_adjustments"."amount") = 'integer')
);
--> statement-breakpoint
CREATE INDEX `order_adjustments_order_idx` ON `order_adjustments` (`order_id`);--> statement-breakpoint
CREATE TABLE `order_lines` (
	`id` integer PRIMARY KEY NOT NULL,
	`public_id` text NOT NULL,
	`order_id` integer NOT NULL,
	`variant_id` integer NOT NULL,
	`name` text NOT NULL,
	`sku` text NOT NULL,
	`unit_price_net` integer NOT NULL,
	`unit_price_gross` integer NOT NULL,
	`base_unit_price` integer NOT NULL,
	`surcharge` integer DEFAULT 0 NOT NULL,
	`quantity` integer NOT NULL,
	`stock_units` integer NOT NULL,
	`location_id` integer,
	`personalization` text,
	`fulfillment_type` text DEFAULT 'physical' NOT NULL,
	`customizes_goods` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`location_id`) REFERENCES `stock_locations`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "order_lines_quantity_ck" CHECK("order_lines"."quantity" > 0),
	CONSTRAINT "order_lines_fulfillment_type_ck" CHECK("order_lines"."fulfillment_type" IN ('physical', 'digital')),
	CONSTRAINT "order_lines_amounts_ck" CHECK(typeof("order_lines"."unit_price_net") = 'integer' AND typeof("order_lines"."unit_price_gross") = 'integer' AND typeof("order_lines"."base_unit_price") = 'integer' AND typeof("order_lines"."surcharge") = 'integer')
);
--> statement-breakpoint
CREATE UNIQUE INDEX `order_lines_public_id_uq` ON `order_lines` (`public_id`);--> statement-breakpoint
CREATE INDEX `order_lines_order_idx` ON `order_lines` (`order_id`);--> statement-breakpoint
CREATE INDEX `order_lines_variant_idx` ON `order_lines` (`variant_id`);--> statement-breakpoint
CREATE TABLE `order_shipping_lines` (
	`id` integer PRIMARY KEY NOT NULL,
	`order_id` integer NOT NULL,
	`shipping_method_id` integer,
	`method_name` text NOT NULL,
	`weight` integer,
	`amount` integer NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`shipping_method_id`) REFERENCES `shipping_methods`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "order_shipping_lines_amount_ck" CHECK(typeof("order_shipping_lines"."amount") = 'integer' AND "order_shipping_lines"."amount" >= 0)
);
--> statement-breakpoint
CREATE INDEX `order_shipping_lines_order_idx` ON `order_shipping_lines` (`order_id`);--> statement-breakpoint
CREATE TABLE `order_tax_lines` (
	`id` integer PRIMARY KEY NOT NULL,
	`order_id` integer NOT NULL,
	`order_line_id` integer,
	`rate_bp` integer NOT NULL,
	`amount` integer NOT NULL,
	`tax_category` text,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`order_line_id`) REFERENCES `order_lines`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "order_tax_lines_rate_ck" CHECK(typeof("order_tax_lines"."rate_bp") = 'integer' AND "order_tax_lines"."rate_bp" >= 0),
	CONSTRAINT "order_tax_lines_amount_ck" CHECK(typeof("order_tax_lines"."amount") = 'integer')
);
--> statement-breakpoint
CREATE INDEX `order_tax_lines_order_idx` ON `order_tax_lines` (`order_id`);--> statement-breakpoint
CREATE TABLE `order_events` (
	`id` integer PRIMARY KEY NOT NULL,
	`order_id` integer NOT NULL,
	`kind` text NOT NULL,
	`from_state` text,
	`to_state` text,
	`actor` text,
	`data` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `order_events_order_idx` ON `order_events` (`order_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `order_guest_access` (
	`id` integer PRIMARY KEY NOT NULL,
	`order_id` integer NOT NULL,
	`token_hash` text NOT NULL,
	`revoked_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `order_guest_access_token_uq` ON `order_guest_access` (`token_hash`);--> statement-breakpoint
CREATE INDEX `order_guest_access_order_idx` ON `order_guest_access` (`order_id`);--> statement-breakpoint
CREATE TABLE `order_notes` (
	`id` integer PRIMARY KEY NOT NULL,
	`order_id` integer NOT NULL,
	`body` text NOT NULL,
	`visibility` text NOT NULL,
	`pinned` integer DEFAULT false NOT NULL,
	`author_id` integer NOT NULL,
	`author_name` text NOT NULL,
	`created_at` integer NOT NULL,
	`edited_at` integer,
	`deleted_at` integer,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "order_notes_body_ck" CHECK(length("order_notes"."body") <= 5000),
	CONSTRAINT "order_notes_visibility_ck" CHECK("order_notes"."visibility" IN ('internal', 'customer'))
);
--> statement-breakpoint
CREATE INDEX `order_notes_order_idx` ON `order_notes` (`order_id`,"pinned" DESC,"created_at" DESC);--> statement-breakpoint
CREATE TABLE `orders` (
	`id` integer PRIMARY KEY NOT NULL,
	`public_id` text NOT NULL,
	`number` text NOT NULL,
	`channel_id` integer NOT NULL,
	`customer_id` integer NOT NULL,
	`company_id` integer,
	`placed_by_customer_id` integer,
	`reservation_id` integer NOT NULL,
	`source` text DEFAULT 'web' NOT NULL,
	`settlement_token` text,
	`currency` text NOT NULL,
	`subtotal_net` integer NOT NULL,
	`tax_total` integer NOT NULL,
	`total_gross` integer NOT NULL,
	`discount_total` integer NOT NULL,
	`shipping_total` integer NOT NULL,
	`shipping_address` text,
	`billing_address` text,
	`shipping_region` text,
	`assigned_admin_id` integer,
	`state` text DEFAULT 'placed' NOT NULL,
	`payment_status` text NOT NULL,
	`fulfillment_status` text DEFAULT 'unfulfilled' NOT NULL,
	`po_number` text,
	`payment_terms` text,
	`payment_due_at` integer,
	`lang` text NOT NULL,
	`fx_rate` text,
	`legal_snapshot` text,
	`stock_exception` integer DEFAULT false NOT NULL,
	`has_personalization` integer DEFAULT false NOT NULL,
	`custom_fields` text,
	`placed_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`channel_id`) REFERENCES `channels`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`placed_by_customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`reservation_id`) REFERENCES `checkout_reservations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`assigned_admin_id`) REFERENCES `admin_users`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "orders_state_ck" CHECK("orders"."state" IN ('placed', 'completed', 'cancelled')),
	CONSTRAINT "orders_payment_status_ck" CHECK("orders"."payment_status" IN ('awaiting', 'authorized', 'paid', 'partially_refunded', 'refunded')),
	CONSTRAINT "orders_fulfillment_status_ck" CHECK("orders"."fulfillment_status" IN ('unfulfilled', 'partially_fulfilled', 'fulfilled', 'delivered', 'returned')),
	CONSTRAINT "orders_currency_ck" CHECK(length("orders"."currency") = 3),
	CONSTRAINT "orders_totals_ck" CHECK(typeof("orders"."subtotal_net") = 'integer' AND typeof("orders"."tax_total") = 'integer' AND typeof("orders"."total_gross") = 'integer' AND typeof("orders"."discount_total") = 'integer' AND typeof("orders"."shipping_total") = 'integer')
);
--> statement-breakpoint
CREATE UNIQUE INDEX `orders_public_id_uq` ON `orders` (`public_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `orders_reservation_uq` ON `orders` (`reservation_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `orders_number_uq` ON `orders` (`channel_id`,`number`);--> statement-breakpoint
CREATE INDEX `orders_channel_placed_idx` ON `orders` (`channel_id`,`placed_at`);--> statement-breakpoint
CREATE INDEX `orders_customer_placed_idx` ON `orders` (`customer_id`,`placed_at`);--> statement-breakpoint
CREATE INDEX `orders_company_placed_idx` ON `orders` (`company_id`,`placed_at`);--> statement-breakpoint
CREATE INDEX `orders_open_idx` ON `orders` (`state`) WHERE "orders"."state" = 'placed';--> statement-breakpoint
CREATE INDEX `orders_updated_idx` ON `orders` (`updated_at`);--> statement-breakpoint
CREATE INDEX `orders_source_idx` ON `orders` (`channel_id`,`source`,`placed_at`);--> statement-breakpoint
CREATE INDEX `orders_region_idx` ON `orders` (`channel_id`,`shipping_region`);--> statement-breakpoint
CREATE INDEX `orders_payment_due_idx` ON `orders` (`payment_due_at`) WHERE "orders"."payment_status" = 'awaiting';