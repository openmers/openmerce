CREATE TABLE `external_refs` (
	`id` integer PRIMARY KEY NOT NULL,
	`source` text NOT NULL,
	`connection_id` text DEFAULT '' NOT NULL,
	`entity_type` text NOT NULL,
	`local_public_id` text NOT NULL,
	`external_id` text NOT NULL,
	`external_code` text,
	`digest` text,
	`state` text,
	`last_matched_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `external_refs_external_uq` ON `external_refs` (`source`,`connection_id`,`entity_type`,`external_id`);--> statement-breakpoint
CREATE INDEX `external_refs_local_idx` ON `external_refs` (`entity_type`,`local_public_id`);--> statement-breakpoint
CREATE TABLE `outbox` (
	`id` integer PRIMARY KEY NOT NULL,
	`public_id` text NOT NULL,
	`kind` text NOT NULL,
	`event` text,
	`payload` text NOT NULL,
	`app_installation_id` integer,
	`status` text NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`priority` integer NOT NULL,
	`next_attempt_at` integer NOT NULL,
	`claimed_at` integer,
	`dedupe_key` text,
	`last_error` text,
	`request_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT "outbox_kind_ck" CHECK("outbox"."kind" IN ('event', 'notify', 'webhook', 'reindex', 'collection', 'import', 'invoice', 'fulfillment', 'scheduled')),
	CONSTRAINT "outbox_status_ck" CHECK("outbox"."status" IN ('pending', 'sending', 'sent', 'failed', 'dead')),
	CONSTRAINT "outbox_payload_ck" CHECK(json_type("outbox"."payload") = 'object')
);
--> statement-breakpoint
CREATE UNIQUE INDEX `outbox_public_id_uq` ON `outbox` (`public_id`);--> statement-breakpoint
CREATE INDEX `outbox_claim_idx` ON `outbox` (`status`,`priority`,`next_attempt_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `outbox_dedupe_uq` ON `outbox` (`kind`,`dedupe_key`) WHERE "outbox"."status" = 'pending' AND "outbox"."dedupe_key" IS NOT NULL;--> statement-breakpoint
CREATE INDEX `outbox_status_created_idx` ON `outbox` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `outbox_app_created_idx` ON `outbox` (`app_installation_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `scheduled_runs` (
	`id` integer PRIMARY KEY NOT NULL,
	`task` text NOT NULL,
	`period` integer NOT NULL,
	`status` text NOT NULL,
	`started_at` integer NOT NULL,
	`finished_at` integer,
	`error` text,
	`outbox_id` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT "scheduled_runs_status_ck" CHECK("scheduled_runs"."status" IN ('running', 'done', 'failed'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `scheduled_runs_task_period_uq` ON `scheduled_runs` (`task`,`period`);