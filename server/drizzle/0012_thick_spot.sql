CREATE TYPE "public"."notification_type" AS ENUM('friend_request', 'friend_accepted', 'collaborator_invited', 'collaborator_joined', 'proposal_submitted', 'proposal_accepted', 'proposal_rejected');--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "notification_type" NOT NULL,
	"data" json DEFAULT '{}'::json,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
