-- Clear existing songs (old UUID user IDs won't match Clerk user IDs)
TRUNCATE TABLE "deleted_songs";--> statement-breakpoint
TRUNCATE TABLE "songs";--> statement-breakpoint
ALTER TABLE "users" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "users" CASCADE;--> statement-breakpoint
ALTER TABLE "deleted_songs" ALTER COLUMN "user_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "songs" ALTER COLUMN "user_id" SET DATA TYPE text;
