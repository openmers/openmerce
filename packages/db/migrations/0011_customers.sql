CREATE TABLE `accounts` (
	`id` integer PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
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
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `accounts_provider_account_uq` ON `accounts` (`provider_id`,`account_id`);--> statement-breakpoint
CREATE INDEX `accounts_user_idx` ON `accounts` (`user_id`);--> statement-breakpoint
CREATE TABLE `auth_verifications` (
	`id` integer PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `auth_verifications_identifier_idx` ON `auth_verifications` (`identifier`);--> statement-breakpoint
CREATE INDEX `auth_verifications_expires_idx` ON `auth_verifications` (`expires_at`);--> statement-breakpoint
CREATE TABLE `passkeys` (
	`id` integer PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`name` text,
	`public_key` text NOT NULL,
	`credential_id` text NOT NULL,
	`counter` integer NOT NULL,
	`device_type` text NOT NULL,
	`backed_up` integer NOT NULL,
	`transports` text,
	`aaguid` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `passkeys_credential_uq` ON `passkeys` (`credential_id`);--> statement-breakpoint
CREATE INDEX `passkeys_user_idx` ON `passkeys` (`user_id`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` integer PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`token` text NOT NULL,
	`expires_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`customer_id` integer NOT NULL,
	`group_ids` text NOT NULL,
	`active_company_id` integer,
	`company_role` text,
	`price_list_ids` text NOT NULL,
	`session_version` integer NOT NULL,
	`version` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "sessions_group_ids_ck" CHECK(json_type("sessions"."group_ids") = 'array'),
	CONSTRAINT "sessions_price_list_ids_ck" CHECK(json_type("sessions"."price_list_ids") = 'array'),
	CONSTRAINT "sessions_company_role_ck" CHECK("sessions"."company_role" IN ('admin', 'buyer', 'approver'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_token_uq` ON `sessions` (`token`);--> statement-breakpoint
CREATE INDEX `sessions_user_idx` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `sessions_expires_idx` ON `sessions` (`expires_at`);--> statement-breakpoint
CREATE TABLE `two_factors` (
	`id` integer PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`secret` text NOT NULL,
	`backup_codes` text NOT NULL,
	`verified` integer DEFAULT true NOT NULL,
	`failed_verification_count` integer DEFAULT 0 NOT NULL,
	`locked_until` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `two_factors_user_uq` ON `two_factors` (`user_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer DEFAULT false NOT NULL,
	`image` text,
	`phone_number` text,
	`phone_number_verified` integer,
	`two_factor_enabled` integer DEFAULT false NOT NULL,
	`session_version` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_uq` ON `users` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_phone_number_uq` ON `users` (`phone_number`) WHERE "users"."phone_number" IS NOT NULL;--> statement-breakpoint
CREATE TABLE `consents` (
	`id` integer PRIMARY KEY NOT NULL,
	`customer_id` integer NOT NULL,
	`channel` text NOT NULL,
	`purpose` text NOT NULL,
	`status` text NOT NULL,
	`source` text NOT NULL,
	`reason` text,
	`text_version` text,
	`ip_hash` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "consents_channel_ck" CHECK("consents"."channel" IN ('email', 'sms', 'call', 'push')),
	CONSTRAINT "consents_purpose_ck" CHECK("consents"."purpose" IN ('marketing', 'analytics')),
	CONSTRAINT "consents_status_ck" CHECK("consents"."status" IN ('granted', 'withdrawn')),
	CONSTRAINT "consents_source_ck" CHECK("consents"."source" IN ('checkout', 'account', 'admin', 'import', 'unsubscribe', 'bounce')),
	CONSTRAINT "consents_reason_ck" CHECK("consents"."source" <> 'admin' OR "consents"."reason" IS NOT NULL)
);
--> statement-breakpoint
CREATE INDEX `consents_customer_idx` ON `consents` (`customer_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `customer_consent_state` (
	`customer_id` integer NOT NULL,
	`channel` text NOT NULL,
	`purpose` text NOT NULL,
	`status` text NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`customer_id`, `channel`, `purpose`),
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "customer_consent_state_channel_ck" CHECK("customer_consent_state"."channel" IN ('email', 'sms', 'call', 'push')),
	CONSTRAINT "customer_consent_state_purpose_ck" CHECK("customer_consent_state"."purpose" IN ('marketing', 'analytics')),
	CONSTRAINT "customer_consent_state_status_ck" CHECK("customer_consent_state"."status" IN ('granted', 'withdrawn'))
);
--> statement-breakpoint
CREATE INDEX `customer_consent_state_filter_idx` ON `customer_consent_state` (`channel`,`purpose`,`status`);--> statement-breakpoint
CREATE TABLE `customer_group_members` (
	`group_id` integer NOT NULL,
	`customer_id` integer NOT NULL,
	`source` text NOT NULL,
	`added_at` integer NOT NULL,
	PRIMARY KEY(`group_id`, `customer_id`),
	FOREIGN KEY (`group_id`) REFERENCES `customer_groups`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "customer_group_members_source_ck" CHECK("customer_group_members"."source" IN ('manual', 'rule'))
);
--> statement-breakpoint
CREATE INDEX `customer_group_members_customer_idx` ON `customer_group_members` (`customer_id`);--> statement-breakpoint
CREATE TABLE `customer_groups` (
	`id` integer PRIMARY KEY NOT NULL,
	`public_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`kind` text NOT NULL,
	`rule` text,
	`affects_commerce` integer NOT NULL,
	`rule_version` integer DEFAULT 0 NOT NULL,
	`last_evaluated_at` integer,
	`metadata` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT "customer_groups_kind_ck" CHECK("customer_groups"."kind" IN ('manual', 'smart'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `customer_groups_public_id_uq` ON `customer_groups` (`public_id`);--> statement-breakpoint
CREATE TABLE `customer_notes` (
	`id` integer PRIMARY KEY NOT NULL,
	`public_id` text NOT NULL,
	`customer_id` integer NOT NULL,
	`author_id` integer NOT NULL,
	`body` text NOT NULL,
	`pinned` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`author_id`) REFERENCES `admin_users`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "customer_notes_body_ck" CHECK(length("customer_notes"."body") <= 5000)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `customer_notes_public_id_uq` ON `customer_notes` (`public_id`);--> statement-breakpoint
CREATE INDEX `customer_notes_customer_idx` ON `customer_notes` (`customer_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `customer_tags` (
	`customer_id` integer NOT NULL,
	`tag` text NOT NULL,
	PRIMARY KEY(`customer_id`, `tag`),
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `customer_tags_tag_idx` ON `customer_tags` (`tag`);--> statement-breakpoint
CREATE TABLE `addresses` (
	`id` integer PRIMARY KEY NOT NULL,
	`public_id` text NOT NULL,
	`customer_id` integer NOT NULL,
	`label` text,
	`first_name` text,
	`last_name` text,
	`company` text,
	`address_line1` text NOT NULL,
	`address_line2` text,
	`city` text NOT NULL,
	`region` text,
	`district` text,
	`postal_code` text,
	`country` text NOT NULL,
	`phone` text,
	`tax_id` text,
	`tax_id_type` text,
	`custom_fields` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "addresses_country_ck" CHECK(length("addresses"."country") = 2)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `addresses_public_id_uq` ON `addresses` (`public_id`);--> statement-breakpoint
CREATE INDEX `addresses_customer_idx` ON `addresses` (`customer_id`);--> statement-breakpoint
CREATE INDEX `addresses_country_idx` ON `addresses` (`country`);--> statement-breakpoint
CREATE TABLE `customer_channels` (
	`customer_id` integer NOT NULL,
	`channel_id` integer NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`customer_id`, `channel_id`),
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`channel_id`) REFERENCES `channels`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `customer_channels_channel_idx` ON `customer_channels` (`channel_id`,`customer_id`);--> statement-breakpoint
CREATE TABLE `customer_payment_methods` (
	`id` integer PRIMARY KEY NOT NULL,
	`public_id` text NOT NULL,
	`customer_id` integer NOT NULL,
	`handler` text NOT NULL,
	`provider_token` text NOT NULL,
	`brand` text,
	`last4` text,
	`exp_month` integer,
	`exp_year` integer,
	`is_default` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `customer_payment_methods_public_id_uq` ON `customer_payment_methods` (`public_id`);--> statement-breakpoint
CREATE INDEX `customer_payment_methods_customer_idx` ON `customer_payment_methods` (`customer_id`);--> statement-breakpoint
CREATE INDEX `customer_payment_methods_exp_idx` ON `customer_payment_methods` (`exp_year`,`exp_month`);--> statement-breakpoint
CREATE TABLE `customers` (
	`id` integer PRIMARY KEY NOT NULL,
	`public_id` text NOT NULL,
	`email` text NOT NULL,
	`email_normalized` text NOT NULL,
	`email_verified_at` integer,
	`first_name` text,
	`last_name` text,
	`company_name` text,
	`phone` text,
	`locale` text,
	`user_id` integer,
	`assigned_admin_id` integer,
	`source` text NOT NULL,
	`state` text DEFAULT 'active' NOT NULL,
	`default_shipping_address_id` integer,
	`default_billing_address_id` integer,
	`merged_into` integer,
	`legal_hold` integer DEFAULT false NOT NULL,
	`deletion_requested_at` integer,
	`custom_fields` text,
	`metadata` text,
	`private_metadata` text,
	`created_by` integer,
	`version` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`assigned_admin_id`) REFERENCES `admin_users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`default_shipping_address_id`) REFERENCES `addresses`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`default_billing_address_id`) REFERENCES `addresses`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`merged_into`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `admin_users`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "customers_source_ck" CHECK("customers"."source" IN ('checkout', 'register', 'admin', 'import', 'marketplace')),
	CONSTRAINT "customers_state_ck" CHECK("customers"."state" IN ('active', 'disabled', 'anonymized'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `customers_public_id_uq` ON `customers` (`public_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `customers_email_normalized_uq` ON `customers` (`email_normalized`);--> statement-breakpoint
CREATE UNIQUE INDEX `customers_user_uq` ON `customers` (`user_id`) WHERE "customers"."user_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX `customers_created_idx` ON `customers` (`created_at`);--> statement-breakpoint
CREATE INDEX `customers_deletion_idx` ON `customers` (`deletion_requested_at`) WHERE "customers"."deletion_requested_at" IS NOT NULL;