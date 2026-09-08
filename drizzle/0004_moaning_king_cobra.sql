CREATE TABLE "watch_session" (
	"id" text PRIMARY KEY NOT NULL,
	"conference_id" text NOT NULL,
	"user_id" text NOT NULL,
	"first_seen_at" timestamp DEFAULT now() NOT NULL,
	"last_seen_at" timestamp DEFAULT now() NOT NULL,
	"live_watch_seconds" integer DEFAULT 0 NOT NULL,
	"recorded_watch_seconds" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "watch_session" ADD CONSTRAINT "watch_session_conference_id_conference_id_fk" FOREIGN KEY ("conference_id") REFERENCES "public"."conference"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "watch_session" ADD CONSTRAINT "watch_session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "watch_session_conference_user_uidx" ON "watch_session" USING btree ("conference_id","user_id");--> statement-breakpoint
CREATE INDEX "watch_session_conferenceId_idx" ON "watch_session" USING btree ("conference_id");