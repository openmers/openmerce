CREATE TABLE `admin_accounts` (
	`id` integer PRIMARY KEY NOT NULL,
	`admin_user_id` integer NOT NULL,
	`provider_id` text NOT NULL,
	`account_id` text NOT NULL,
	`password` text,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`admin_user_id`) REFERENCES `admin_users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `admin_accounts_provider_account_uq` ON `admin_accounts` (`provider_id`,`account_id`);--> statement-breakpoint
CREATE INDEX `admin_accounts_admin_user_idx` ON `admin_accounts` (`admin_user_id`);--> statement-breakpoint
CREATE TABLE `admin_passkeys` (
	`id` integer PRIMARY KEY NOT NULL,
	`admin_user_id` integer NOT NULL,
	`name` text,
	`public_key` text NOT NULL,
	`credential_id` text NOT NULL,
	`counter` integer NOT NULL,
	`device_type` text NOT NULL,
	`backed_up` integer NOT NULL,
	`transports` text,
	`aaguid` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`admin_user_id`) REFERENCES `admin_users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `admin_passkeys_credential_uq` ON `admin_passkeys` (`credential_id`);--> statement-breakpoint
CREATE INDEX `admin_passkeys_admin_user_idx` ON `admin_passkeys` (`admin_user_id`);--> statement-breakpoint
CREATE TABLE `admin_sessions` (
	`id` integer PRIMARY KEY NOT NULL,
	`admin_user_id` integer NOT NULL,
	`token` text NOT NULL,
	`expires_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`session_version` integer NOT NULL,
	`permissions` text NOT NULL,
	`policy_sql` text,
	`reauth_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`admin_user_id`) REFERENCES `admin_users`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "admin_sessions_permissions_ck" CHECK(json_type("admin_sessions"."permissions") = 'object')
);
--> statement-breakpoint
CREATE UNIQUE INDEX `admin_sessions_token_uq` ON `admin_sessions` (`token`);--> statement-breakpoint
CREATE INDEX `admin_sessions_admin_user_idx` ON `admin_sessions` (`admin_user_id`);--> statement-breakpoint
CREATE INDEX `admin_sessions_expires_idx` ON `admin_sessions` (`expires_at`);--> statement-breakpoint
CREATE TABLE `admin_two_factors` (
	`id` integer PRIMARY KEY NOT NULL,
	`admin_user_id` integer NOT NULL,
	`secret` text NOT NULL,
	`backup_codes` text NOT NULL,
	`verified` integer DEFAULT true NOT NULL,
	`failed_verification_count` integer DEFAULT 0 NOT NULL,
	`locked_until` integer,
	FOREIGN KEY (`admin_user_id`) REFERENCES `admin_users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `admin_two_factors_admin_user_uq` ON `admin_two_factors` (`admin_user_id`);--> statement-breakpoint
CREATE TABLE `admin_users` (
	`id` integer PRIMARY KEY NOT NULL,
	`public_id` text NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer DEFAULT false NOT NULL,
	`image` text,
	`two_factor_enabled` integer DEFAULT false NOT NULL,
	`session_version` integer DEFAULT 0 NOT NULL,
	`status` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT "admin_users_status_ck" CHECK("admin_users"."status" IN ('invited', 'active', 'suspended'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `admin_users_public_id_uq` ON `admin_users` (`public_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `admin_users_email_uq` ON `admin_users` (`email`);--> statement-breakpoint
CREATE TABLE `admin_verifications` (
	`id` integer PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `admin_verifications_identifier_idx` ON `admin_verifications` (`identifier`);--> statement-breakpoint
CREATE INDEX `admin_verifications_expires_idx` ON `admin_verifications` (`expires_at`);--> statement-breakpoint
CREATE TABLE `access_policies` (
	`id` integer PRIMARY KEY NOT NULL,
	`public_id` text NOT NULL,
	`name` text NOT NULL,
	`role_id` integer,
	`admin_id` integer,
	`resource` text NOT NULL,
	`condition` text NOT NULL,
	`active` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`admin_id`) REFERENCES `admin_users`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "access_policies_target_ck" CHECK(("access_policies"."role_id" IS NULL) <> ("access_policies"."admin_id" IS NULL)),
	CONSTRAINT "access_policies_resource_ck" CHECK("access_policies"."resource" IN ('orders', 'customers', 'products', 'companies', 'quotes')),
	CONSTRAINT "access_policies_condition_ck" CHECK(json_type("access_policies"."condition") = 'object')
);
--> statement-breakpoint
CREATE UNIQUE INDEX `access_policies_public_id_uq` ON `access_policies` (`public_id`);--> statement-breakpoint
CREATE INDEX `access_policies_role_idx` ON `access_policies` (`role_id`);--> statement-breakpoint
CREATE INDEX `access_policies_admin_idx` ON `access_policies` (`admin_id`);--> statement-breakpoint
CREATE TABLE `admin_role_assignments` (
	`id` integer PRIMARY KEY NOT NULL,
	`admin_user_id` integer NOT NULL,
	`role_id` integer NOT NULL,
	`channel_id` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`admin_user_id`) REFERENCES `admin_users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`channel_id`) REFERENCES `channels`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `admin_role_assignments_uq` ON `admin_role_assignments` (`admin_user_id`,`role_id`,coalesce(`channel_id`, 0));--> statement-breakpoint
CREATE INDEX `admin_role_assignments_role_idx` ON `admin_role_assignments` (`role_id`);--> statement-breakpoint
CREATE TABLE `role_permissions` (
	`role_id` integer NOT NULL,
	`permission` text NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`role_id`, `permission`),
	FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `roles` (
	`id` integer PRIMARY KEY NOT NULL,
	`public_id` text NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`is_system` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `roles_public_id_uq` ON `roles` (`public_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `roles_code_uq` ON `roles` (`code`);