CREATE TABLE `api_keys` (
	`id` integer PRIMARY KEY NOT NULL,
	`public_id` text NOT NULL,
	`name` text NOT NULL,
	`key_prefix` text NOT NULL,
	`key_hash` text NOT NULL,
	`permissions` text NOT NULL,
	`channel_ids` text,
	`created_by_admin_id` integer NOT NULL,
	`last_used_at` integer,
	`revoked_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`created_by_admin_id`) REFERENCES `admin_users`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "api_keys_permissions_ck" CHECK(json_type("api_keys"."permissions") = 'array'),
	CONSTRAINT "api_keys_channel_ids_ck" CHECK(json_type("api_keys"."channel_ids") = 'array')
);
--> statement-breakpoint
CREATE UNIQUE INDEX `api_keys_public_id_uq` ON `api_keys` (`public_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `api_keys_key_hash_uq` ON `api_keys` (`key_hash`);--> statement-breakpoint
CREATE TABLE `audit_anchors` (
	`id` integer PRIMARY KEY NOT NULL,
	`day` integer NOT NULL,
	`last_seq` integer NOT NULL,
	`last_hash` text NOT NULL,
	`signature` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `audit_anchors_day_uq` ON `audit_anchors` (`day`);--> statement-breakpoint
CREATE TABLE `audit_log` (
	`seq` integer PRIMARY KEY NOT NULL,
	`public_id` text NOT NULL,
	`actor_type` text NOT NULL,
	`actor_id` integer,
	`via_app_installation_id` integer,
	`on_behalf_customer_id` integer,
	`action` text NOT NULL,
	`entity_type` text,
	`entity_public_id` text,
	`channel_id` integer,
	`before` text,
	`after` text,
	`request_id` text,
	`created_at` integer NOT NULL,
	`prev_hash` text,
	`row_hash` text,
	CONSTRAINT "audit_log_actor_type_ck" CHECK("audit_log"."actor_type" IN ('admin', 'app', 'apiKey', 'agent', 'system'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `audit_log_public_id_uq` ON `audit_log` (`public_id`);--> statement-breakpoint
CREATE INDEX `audit_log_unsealed_idx` ON `audit_log` (`seq`) WHERE "audit_log"."row_hash" IS NULL;--> statement-breakpoint
CREATE INDEX `audit_log_entity_idx` ON `audit_log` (`entity_type`,`entity_public_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `audit_log_actor_idx` ON `audit_log` (`actor_type`,`actor_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `audit_log_action_idx` ON `audit_log` (`action`,`created_at`);--> statement-breakpoint
CREATE INDEX `audit_log_created_idx` ON `audit_log` (`created_at`);--> statement-breakpoint
CREATE TABLE `channel_publishable_keys` (
	`id` integer PRIMARY KEY NOT NULL,
	`public_id` text NOT NULL,
	`channel_id` integer NOT NULL,
	`name` text,
	`key_prefix` text NOT NULL,
	`key_hash` text NOT NULL,
	`last_used_at` integer,
	`revoked_at` integer,
	`expires_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`channel_id`) REFERENCES `channels`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `channel_publishable_keys_public_id_uq` ON `channel_publishable_keys` (`public_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `channel_publishable_keys_key_hash_uq` ON `channel_publishable_keys` (`key_hash`);--> statement-breakpoint
CREATE INDEX `channel_publishable_keys_channel_idx` ON `channel_publishable_keys` (`channel_id`);--> statement-breakpoint
CREATE TABLE `idempotency_keys` (
	`id` integer PRIMARY KEY NOT NULL,
	`actor_type` text NOT NULL,
	`actor_id` integer DEFAULT 0 NOT NULL,
	`key` text NOT NULL,
	`request_hash` text NOT NULL,
	`status` text NOT NULL,
	`response_status` integer,
	`response` text,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT "idempotency_keys_actor_type_ck" CHECK("idempotency_keys"."actor_type" IN ('customer', 'admin', 'app', 'apiKey', 'anonymous')),
	CONSTRAINT "idempotency_keys_status_ck" CHECK("idempotency_keys"."status" IN ('in_progress', 'done'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idempotency_keys_actor_key_uq` ON `idempotency_keys` (`actor_type`,`actor_id`,`key`);--> statement-breakpoint
CREATE INDEX `idempotency_keys_expires_idx` ON `idempotency_keys` (`expires_at`);--> statement-breakpoint
CREATE TABLE `secrets` (
	`id` integer PRIMARY KEY NOT NULL,
	`scope` text NOT NULL,
	`scope_id` integer DEFAULT 0 NOT NULL,
	`key` text NOT NULL,
	`ciphertext` blob NOT NULL,
	`iv` blob NOT NULL,
	`kek_version` integer NOT NULL,
	`updated_by_admin_id` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`updated_by_admin_id`) REFERENCES `admin_users`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "secrets_scope_ck" CHECK("secrets"."scope" IN ('global', 'channel', 'built_in_app', 'app_installation')),
	CONSTRAINT "secrets_scope_id_ck" CHECK(("secrets"."scope" IN ('global', 'built_in_app')) = ("secrets"."scope_id" = 0)),
	CONSTRAINT "secrets_iv_ck" CHECK(length("secrets"."iv") = 12)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `secrets_scope_key_uq` ON `secrets` (`scope`,`scope_id`,`key`);