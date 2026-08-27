CREATE TABLE "watch_heartbeat" (
	"id" text PRIMARY KEY NOT NULL,
	"conference_id" text NOT NULL,
	"user_id" text NOT NULL,
	"seen_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "watch_heartbeat" ADD CONSTRAINT "watch_heartbeat_conference_id_conference_id_fk" FOREIGN KEY ("conference_id") REFERENCES "public"."conference"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "watch_heartbeat" ADD CONSTRAINT "watch_heartbeat_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "watch_heartbeat_conference_seenAt_idx" ON "watch_heartbeat" USING btree ("conference_id","seen_at");