CREATE TABLE `promotion_usage` (
	`id` integer PRIMARY KEY NOT NULL,
	`promotion_id` integer NOT NULL,
	`customer_id` integer,
	`reservation_id` integer NOT NULL,
	`order_id` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`promotion_id`) REFERENCES `promotions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`reservation_id`) REFERENCES `checkout_reservations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `promotion_usage_customer_idx` ON `promotion_usage` (`promotion_id`,`customer_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `promotion_usage_reservation_uq` ON `promotion_usage` (`promotion_id`,`reservation_id`);--> statement-breakpoint
CREATE TABLE `promotions` (
	`id` integer PRIMARY KEY NOT NULL,
	`public_id` text NOT NULL,
	`name` text NOT NULL,
	`starts_at` integer,
	`ends_at` integer,
	`enabled` integer NOT NULL,
	`priority` integer NOT NULL,
	`coupon_code` text,
	`usage_limit` integer,
	`per_customer_limit` integer,
	`used` integer DEFAULT 0 NOT NULL,
	`conditions` text NOT NULL,
	`actions` text NOT NULL,
	`stackable` integer NOT NULL,
	`apply_to_contract` integer DEFAULT false NOT NULL,
	`version` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT "promotions_used_ck" CHECK("promotions"."used" >= 0),
	CONSTRAINT "promotions_limits_ck" CHECK(("promotions"."usage_limit" IS NULL OR "promotions"."usage_limit" >= 0) AND ("promotions"."per_customer_limit" IS NULL OR "promotions"."per_customer_limit" >= 0)),
	CONSTRAINT "promotions_conditions_ck" CHECK(json_type("promotions"."conditions") = 'array'),
	CONSTRAINT "promotions_actions_ck" CHECK(json_type("promotions"."actions") = 'array')
);
--> statement-breakpoint
CREATE UNIQUE INDEX `promotions_public_id_uq` ON `promotions` (`public_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `promotions_coupon_code_uq` ON `promotions` (`coupon_code`) WHERE "promotions"."coupon_code" IS NOT NULL;