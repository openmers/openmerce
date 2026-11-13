CREATE TABLE `settings` (
	`id` integer PRIMARY KEY NOT NULL,
	`scope` text NOT NULL,
	`scope_id` integer DEFAULT 0 NOT NULL,
	`key` text NOT NULL,
	`value` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT "settings_scope_ck" CHECK("settings"."scope" IN ('global', 'channel', 'admin_user', 'customer', 'built_in_app')),
	CONSTRAINT "settings_scope_id_ck" CHECK(("settings"."scope" IN ('global', 'built_in_app')) = ("settings"."scope_id" = 0)),
	CONSTRAINT "settings_key_ck" CHECK(length("settings"."key") > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `settings_scope_key_uq` ON `settings` (`scope`,`scope_id`,`key`);