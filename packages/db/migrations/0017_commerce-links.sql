CREATE TABLE `order_number_counters` (
	`channel_id` integer NOT NULL,
	`period` integer NOT NULL,
	`last_value` integer NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`channel_id`, `period`),
	FOREIGN KEY (`channel_id`) REFERENCES `channels`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `payment_method_channels` (
	`payment_method_id` integer NOT NULL,
	`channel_id` integer NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`payment_method_id`, `channel_id`),
	FOREIGN KEY (`payment_method_id`) REFERENCES `payment_methods`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`channel_id`) REFERENCES `channels`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `payment_method_channels_channel_idx` ON `payment_method_channels` (`channel_id`,`payment_method_id`);--> statement-breakpoint
CREATE TABLE `promotion_channels` (
	`promotion_id` integer NOT NULL,
	`channel_id` integer NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`promotion_id`, `channel_id`),
	FOREIGN KEY (`promotion_id`) REFERENCES `promotions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`channel_id`) REFERENCES `channels`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `promotion_channels_channel_idx` ON `promotion_channels` (`channel_id`,`promotion_id`);--> statement-breakpoint
CREATE TABLE `shipping_method_channels` (
	`shipping_method_id` integer NOT NULL,
	`channel_id` integer NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`shipping_method_id`, `channel_id`),
	FOREIGN KEY (`shipping_method_id`) REFERENCES `shipping_methods`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`channel_id`) REFERENCES `channels`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `shipping_method_channels_channel_idx` ON `shipping_method_channels` (`channel_id`,`shipping_method_id`);