CREATE TABLE "active_viewer" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"device_id" text NOT NULL,
	"conference_id" text NOT NULL,
	"ip_address" text,
	"first_seen_at" timestamp DEFAULT now() NOT NULL,
	"last_seen_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "active_viewer" ADD CONSTRAINT "active_viewer_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "active_viewer" ADD CONSTRAINT "active_viewer_conference_id_conference_id_fk" FOREIGN KEY ("conference_id") REFERENCES "public"."conference"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "active_viewer_user_device_uidx" ON "active_viewer" USING btree ("user_id","device_id");--> statement-breakpoint
CREATE INDEX "active_viewer_userId_idx" ON "active_viewer" USING btree ("user_id");