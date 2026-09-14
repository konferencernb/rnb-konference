CREATE TABLE "email_log" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"recipient" text NOT NULL,
	"success" boolean NOT NULL,
	"error" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "email_log_createdAt_idx" ON "email_log" USING btree ("created_at");