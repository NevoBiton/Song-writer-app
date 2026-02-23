CREATE TABLE "deleted_songs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"artist" text,
	"key" text,
	"capo" integer DEFAULT 0,
	"language" text DEFAULT 'en',
	"sections" json DEFAULT '[]'::json,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"deleted_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "deleted_songs" ADD CONSTRAINT "deleted_songs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;