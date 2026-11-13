CREATE TABLE `digital_entitlements` (
	`id` integer PRIMARY KEY NOT NULL,
	`public_id` text NOT NULL,
	`order_line_id` integer NOT NULL,
	`customer_id` integer,
	`media_id` integer NOT NULL,
	`token_hash` text NOT NULL,
	`expires_at` integer NOT NULL,
	`download_limit` integer NOT NULL,
	`downloads` integer DEFAULT 0 NOT NULL,
	`revoked_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`order_line_id`) REFERENCES `order_lines`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`media_id`) REFERENCES `media`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "digital_entitlements_downloads_ck" CHECK("digital_entitlements"."downloads" >= 0 AND "digital_entitlements"."download_limit" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `digital_entitlements_public_id_uq` ON `digital_entitlements` (`public_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `digital_entitlements_token_uq` ON `digital_entitlements` (`token_hash`);--> statement-breakpoint
CREATE INDEX `digital_entitlements_order_line_idx` ON `digital_entitlements` (`order_line_id`);--> statement-breakpoint
CREATE TABLE `fulfillment_lines` (
	`fulfillment_id` integer NOT NULL,
	`order_line_id` integer NOT NULL,
	`quantity` integer NOT NULL,
	PRIMARY KEY(`fulfillment_id`, `order_line_id`),
	FOREIGN KEY (`fulfillment_id`) REFERENCES `fulfillments`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`order_line_id`) REFERENCES `order_lines`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "fulfillment_lines_quantity_ck" CHECK("fulfillment_lines"."quantity" > 0)
);
--> statement-breakpoint
CREATE INDEX `fulfillment_lines_order_line_idx` ON `fulfillment_lines` (`order_line_id`);--> statement-breakpoint
CREATE TABLE `fulfillments` (
	`id` integer PRIMARY KEY NOT NULL,
	`public_id` text NOT NULL,
	`order_id` integer NOT NULL,
	`location_id` integer,
	`kind` text DEFAULT 'physical' NOT NULL,
	`state` text DEFAULT 'pending' NOT NULL,
	`handler_code` text DEFAULT 'manual' NOT NULL,
	`carrier` text,
	`tracking_number` text,
	`tracking_url_template` text,
	`label_media_id` integer,
	`delivered_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`location_id`) REFERENCES `stock_locations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`label_media_id`) REFERENCES `media`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "fulfillments_kind_ck" CHECK("fulfillments"."kind" IN ('physical', 'digital')),
	CONSTRAINT "fulfillments_state_ck" CHECK("fulfillments"."state" IN ('pending', 'shipped', 'delivered', 'cancelled'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `fulfillments_public_id_uq` ON `fulfillments` (`public_id`);--> statement-breakpoint
CREATE INDEX `fulfillments_order_idx` ON `fulfillments` (`order_id`);--> statement-breakpoint
CREATE INDEX `fulfillments_tracking_idx` ON `fulfillments` (`carrier`,`tracking_number`);--> statement-breakpoint
CREATE TABLE `returns` (
	`id` integer PRIMARY KEY NOT NULL,
	`public_id` text NOT NULL,
	`order_id` integer NOT NULL,
	`lines` text NOT NULL,
	`reason` text,
	`state` text DEFAULT 'requested' NOT NULL,
	`kind` text NOT NULL,
	`notice_channel` text,
	`notice_at` integer,
	`return_code` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "returns_lines_ck" CHECK(json_type("returns"."lines") = 'array'),
	CONSTRAINT "returns_state_ck" CHECK("returns"."state" IN ('requested', 'approved', 'received', 'rejected')),
	CONSTRAINT "returns_kind_ck" CHECK("returns"."kind" IN ('withdrawal', 'other')),
	CONSTRAINT "returns_notice_channel_ck" CHECK("returns"."notice_channel" IN ('form', 'email', 'written'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `returns_public_id_uq` ON `returns` (`public_id`);--> statement-breakpoint
CREATE INDEX `returns_order_idx` ON `returns` (`order_id`);--> statement-breakpoint
CREATE INDEX `returns_state_idx` ON `returns` (`state`,`created_at`);