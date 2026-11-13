CREATE TABLE `digital_assets` (
	`id` integer PRIMARY KEY NOT NULL,
	`variant_id` integer NOT NULL,
	`media_id` integer NOT NULL,
	`version` integer NOT NULL,
	`label` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`media_id`) REFERENCES `media`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `digital_assets_variant_idx` ON `digital_assets` (`variant_id`,`version`);--> statement-breakpoint
CREATE INDEX `digital_assets_media_idx` ON `digital_assets` (`media_id`);--> statement-breakpoint
CREATE TABLE `media` (
	`id` integer PRIMARY KEY NOT NULL,
	`public_id` text NOT NULL,
	`status` text NOT NULL,
	`bucket` text NOT NULL,
	`key` text NOT NULL,
	`mime` text,
	`bytes` integer,
	`width` integer,
	`height` integer,
	`sizes` text,
	`owner_kind` text,
	`owner_id` integer,
	`poster_media_id` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`poster_media_id`) REFERENCES `media`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "media_status_ck" CHECK("media"."status" IN ('pending', 'ready', 'rejected')),
	CONSTRAINT "media_bucket_ck" CHECK("media"."bucket" IN ('public', 'private')),
	CONSTRAINT "media_owner_kind_ck" CHECK("media"."owner_kind" IN ('cart', 'order'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `media_public_id_uq` ON `media` (`public_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `media_bucket_key_uq` ON `media` (`bucket`,`key`);--> statement-breakpoint
CREATE INDEX `media_status_created_idx` ON `media` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `media_owner_idx` ON `media` (`owner_kind`,`owner_id`);