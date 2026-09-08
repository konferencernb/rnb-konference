CREATE TABLE "access_log" (
	"id" text PRIMARY KEY NOT NULL,
	"conference_id" text NOT NULL,
	"user_id" text,
	"ip_address" text,
	"user_agent" text,
	"result" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "access_log" ADD CONSTRAINT "access_log_conference_id_conference_id_fk" FOREIGN KEY ("conference_id") REFERENCES "public"."conference"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "access_log" ADD CONSTRAINT "access_log_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "access_log_conferenceId_idx" ON "access_log" USING btree ("conference_id");--> statement-breakpoint
CREATE INDEX "access_log_createdAt_idx" ON "access_log" USING btree ("created_at");