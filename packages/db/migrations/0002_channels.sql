CREATE TABLE `channel_domains` (
	`id` integer PRIMARY KEY NOT NULL,
	`channel_id` integer NOT NULL,
	`domain` text NOT NULL,
	`default_lang` text,
	`is_primary` integer DEFAULT false NOT NULL,
	`secondary_mode` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`channel_id`) REFERENCES `channels`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "channel_domains_domain_ck" CHECK("channel_domains"."domain" = lower("channel_domains"."domain")),
	CONSTRAINT "channel_domains_secondary_mode_ck" CHECK("channel_domains"."secondary_mode" IN ('redirect', 'serve')),
	CONSTRAINT "channel_domains_primary_mode_ck" CHECK(("channel_domains"."is_primary" = 1) = ("channel_domains"."secondary_mode" IS NULL))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `channel_domains_domain_uq` ON `channel_domains` (`domain`);--> statement-breakpoint
CREATE UNIQUE INDEX `channel_domains_primary_uq` ON `channel_domains` (`channel_id`) WHERE "channel_domains"."is_primary" = 1;--> statement-breakpoint
CREATE INDEX `channel_domains_channel_idx` ON `channel_domains` (`channel_id`);--> statement-breakpoint
CREATE TABLE `channels` (
	`id` integer PRIMARY KEY NOT NULL,
	`public_id` text NOT NULL,
	`code` text NOT NULL,
	`type` text DEFAULT 'b2c' NOT NULL,
	`default_currency` text NOT NULL,
	`currencies` text NOT NULL,
	`default_lang` text DEFAULT 'en' NOT NULL,
	`langs` text NOT NULL,
	`prices_include_tax` integer DEFAULT false NOT NULL,
	`access` text DEFAULT 'public' NOT NULL,
	`guest_checkout` integer DEFAULT true NOT NULL,
	`min_order_amounts` text,
	`sync_prices` integer DEFAULT false NOT NULL,
	`statement_name` text,
	`timezone` text DEFAULT 'UTC' NOT NULL,
	`is_default` integer DEFAULT false NOT NULL,
	`settings` text DEFAULT '{}' NOT NULL,
	`settings_version` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT "channels_code_ck" CHECK("channels"."code" = lower("channels"."code")),
	CONSTRAINT "channels_type_ck" CHECK("channels"."type" IN ('b2c', 'b2b', 'hybrid')),
	CONSTRAINT "channels_default_currency_ck" CHECK(length("channels"."default_currency") = 3),
	CONSTRAINT "channels_access_ck" CHECK("channels"."access" IN ('public', 'login_required', 'approved_companies_only')),
	CONSTRAINT "channels_min_order_amounts_ck" CHECK(json_type("channels"."min_order_amounts") = 'object'),
	CONSTRAINT "channels_settings_ck" CHECK(json_type("channels"."settings") = 'object')
);
--> statement-breakpoint
CREATE UNIQUE INDEX `channels_public_id_uq` ON `channels` (`public_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `channels_code_uq` ON `channels` (`code`);--> statement-breakpoint
CREATE UNIQUE INDEX `channels_default_uq` ON `channels` (`is_default`) WHERE "channels"."is_default" = 1;