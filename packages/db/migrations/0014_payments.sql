CREATE TABLE `payment_methods` (
	`id` integer PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`position` integer NOT NULL,
	`handler_code` text NOT NULL,
	`handler_args` text,
	`checker_code` text,
	`checker_args` text,
	`enabled` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `payment_methods_code_uq` ON `payment_methods` (`code`);--> statement-breakpoint
CREATE TABLE `payments` (
	`id` integer PRIMARY KEY NOT NULL,
	`public_id` text NOT NULL,
	`order_id` integer NOT NULL,
	`payment_method_id` integer NOT NULL,
	`amount` integer NOT NULL,
	`currency` text NOT NULL,
	`state` text NOT NULL,
	`provider_reference` text,
	`external_refunded_amount` integer DEFAULT 0 NOT NULL,
	`refunded_amount` integer DEFAULT 0 NOT NULL,
	`statement_descriptor` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`payment_method_id`) REFERENCES `payment_methods`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "payments_state_ck" CHECK("payments"."state" IN ('authorized', 'settled', 'declined', 'cancelled')),
	CONSTRAINT "payments_currency_ck" CHECK(length("payments"."currency") = 3),
	CONSTRAINT "payments_amount_ck" CHECK(typeof("payments"."amount") = 'integer' AND "payments"."amount" >= 0),
	CONSTRAINT "payments_refunded_ck" CHECK(typeof("payments"."refunded_amount") = 'integer' AND typeof("payments"."external_refunded_amount") = 'integer' AND "payments"."refunded_amount" >= 0 AND "payments"."external_refunded_amount" >= 0 AND "payments"."refunded_amount" + "payments"."external_refunded_amount" <= "payments"."amount")
);
--> statement-breakpoint
CREATE UNIQUE INDEX `payments_public_id_uq` ON `payments` (`public_id`);--> statement-breakpoint
CREATE INDEX `payments_order_idx` ON `payments` (`order_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `payments_provider_reference_uq` ON `payments` (`payment_method_id`,`provider_reference`) WHERE "payments"."provider_reference" IS NOT NULL;--> statement-breakpoint
CREATE TABLE `pending_payments` (
	`id` integer PRIMARY KEY NOT NULL,
	`reservation_id` integer NOT NULL,
	`payment_method_id` integer NOT NULL,
	`amount` integer NOT NULL,
	`currency` text NOT NULL,
	`state` text DEFAULT 'pending' NOT NULL,
	`expires_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`reservation_id`) REFERENCES `checkout_reservations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`payment_method_id`) REFERENCES `payment_methods`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "pending_payments_state_ck" CHECK("pending_payments"."state" IN ('pending', 'confirmed', 'cancelled', 'expired')),
	CONSTRAINT "pending_payments_currency_ck" CHECK(length("pending_payments"."currency") = 3),
	CONSTRAINT "pending_payments_amount_ck" CHECK(typeof("pending_payments"."amount") = 'integer' AND "pending_payments"."amount" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `pending_payments_reservation_uq` ON `pending_payments` (`reservation_id`);--> statement-breakpoint
CREATE INDEX `pending_payments_sweep_idx` ON `pending_payments` (`expires_at`) WHERE "pending_payments"."state" = 'pending';--> statement-breakpoint
CREATE TABLE `refunds` (
	`id` integer PRIMARY KEY NOT NULL,
	`public_id` text NOT NULL,
	`payment_id` integer NOT NULL,
	`order_id` integer NOT NULL,
	`return_id` integer,
	`amount` integer NOT NULL,
	`currency` text NOT NULL,
	`reason` text,
	`state` text NOT NULL,
	`lines` text,
	`source` text NOT NULL,
	`provider_event_id` text,
	`provider_refund_id` text,
	`idempotency_key` text,
	`reverses_refund_id` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`payment_id`) REFERENCES `payments`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`return_id`) REFERENCES `returns`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`reverses_refund_id`) REFERENCES `refunds`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "refunds_state_ck" CHECK("refunds"."state" IN ('pending', 'settled', 'failed', 'unknown')),
	CONSTRAINT "refunds_source_ck" CHECK("refunds"."source" IN ('admin', 'provider', 'manual')),
	CONSTRAINT "refunds_currency_ck" CHECK(length("refunds"."currency") = 3),
	CONSTRAINT "refunds_amount_ck" CHECK(typeof("refunds"."amount") = 'integer')
);
--> statement-breakpoint
CREATE UNIQUE INDEX `refunds_public_id_uq` ON `refunds` (`public_id`);--> statement-breakpoint
CREATE INDEX `refunds_payment_idx` ON `refunds` (`payment_id`);--> statement-breakpoint
CREATE INDEX `refunds_order_idx` ON `refunds` (`order_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `refunds_provider_event_uq` ON `refunds` (`payment_id`,`provider_event_id`) WHERE "refunds"."provider_event_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `refunds_provider_refund_uq` ON `refunds` (`payment_id`,`provider_refund_id`) WHERE "refunds"."provider_refund_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `refunds_idempotency_key_uq` ON `refunds` (`idempotency_key`) WHERE "refunds"."idempotency_key" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `refunds_reverses_uq` ON `refunds` (`reverses_refund_id`) WHERE "refunds"."reverses_refund_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX `refunds_unknown_idx` ON `refunds` (`state`) WHERE "refunds"."state" = 'unknown';--> statement-breakpoint
CREATE INDEX `refunds_created_idx` ON `refunds` (`created_at`);