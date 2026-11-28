import { pgTable, uuid, text, integer, json, timestamp, boolean, pgEnum } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  username: text('username').notNull(),
  passwordHash: text('password_hash'),            // nullable — Google-only users have no password
  googleId: text('google_id').unique(),           // nullable — only set for Google OAuth users
  avatar: text('avatar'),
  emailConfirmed: boolean('email_confirmed').default(true).notNull(), // default true so existing users aren't locked out
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const emailConfirmationTokens = pgTable('email_confirmation_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  confirmedAt: timestamp('confirmed_at'),
});

export const passwordResetTokens = pgTable('password_reset_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  usedAt: timestamp('used_at'),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export const songs = pgTable('songs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  title: text('title').notNull(),
  artist: text('artist'),
  key: text('key'),
  capo: integer('capo').default(0),
  language: text('language').default('en'),
  sections: json('sections').default([]),
  recentChords: json('recent_chords').default([]),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const deletedSongs = pgTable('deleted_songs', {
  id: uuid('id').primaryKey(),
  userId: text('user_id').notNull(),
  title: text('title').notNull(),
  artist: text('artist'),
  key: text('key'),
  capo: integer('capo').default(0),
  language: text('language').default('en'),
  sections: json('sections').default([]),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
  deletedAt: timestamp('deleted_at').defaultNow().notNull(),
});

export type Song = typeof songs.$inferSelect;
export type NewSong = typeof songs.$inferInsert;

// ─── Enums ────────────────────────────────────────────────────────────────────

export const friendshipStatusEnum = pgEnum('friendship_status', ['pending', 'accepted', 'declined']);
export const collaboratorRoleEnum = pgEnum('collaborator_role', ['owner', 'editor']);
export const collaboratorInviteStatusEnum = pgEnum('collaborator_invite_status', ['pending', 'accepted']);
export const draftStatusEnum = pgEnum('draft_status', ['draft', 'proposed', 'accepted', 'rejected']);

// ─── Friendships ──────────────────────────────────────────────────────────────

export const friendships = pgTable('friendships', {
  id: uuid('id').primaryKey().defaultRandom(),
  requesterId: uuid('requester_id').notNull(),   // FK → users.id
  addresseeId: uuid('addressee_id').notNull(),   // FK → users.id
  status: friendshipStatusEnum('status').notNull().default('pending'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type Friendship = typeof friendships.$inferSelect;

// ─── Song Collaborators ───────────────────────────────────────────────────────

export const songCollaborators = pgTable('song_collaborators', {
  id: uuid('id').primaryKey().defaultRandom(),
  songId: uuid('song_id').notNull(),             // FK → songs.id
  userId: uuid('user_id').notNull(),             // FK → users.id
  role: collaboratorRoleEnum('role').notNull().default('editor'),
  invitedBy: uuid('invited_by'),                 // FK → users.id (nullable)
  status: collaboratorInviteStatusEnum('status').notNull().default('accepted'), // 'pending' until accepted
  joinedAt: timestamp('joined_at').defaultNow().notNull(),
});

export type SongCollaborator = typeof songCollaborators.$inferSelect;

// ─── Song Drafts ──────────────────────────────────────────────────────────────

export const songDrafts = pgTable('song_drafts', {
  id: uuid('id').primaryKey().defaultRandom(),
  songId: uuid('song_id').notNull(),             // FK → songs.id
  userId: uuid('user_id').notNull(),             // FK → users.id
  sections: json('sections').default([]),
  status: draftStatusEnum('status').notNull().default('draft'),
  note: text('note'),                            // optional message when proposing
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type SongDraft = typeof songDrafts.$inferSelect;

// ─── Song Versions (snapshots on accepted proposals) ─────────────────────────

export const songVersions = pgTable('song_versions', {
  id: uuid('id').primaryKey().defaultRandom(),
  songId: uuid('song_id').notNull(),             // FK → songs.id
  sections: json('sections').default([]),
  proposedBy: uuid('proposed_by').notNull(),     // FK → users.id
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type SongVersion = typeof songVersions.$inferSelect;

// ─── Invite Links ─────────────────────────────────────────────────────────────

export const inviteLinks = pgTable('invite_links', {
  id: uuid('id').primaryKey().defaultRandom(),
  songId: uuid('song_id').notNull(),             // FK → songs.id
  createdBy: uuid('created_by').notNull(),       // FK → users.id
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  usedCount: integer('used_count').default(0).notNull(),
});

export type InviteLink = typeof inviteLinks.$inferSelect;

// ─── Notifications ────────────────────────────────────────────────────────────

export const notificationTypeEnum = pgEnum('notification_type', [
  'friend_request',
  'friend_accepted',
  'collaborator_invited',
  'collaborator_joined',
  'proposal_submitted',
  'proposal_accepted',
  'proposal_rejected',
]);

export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),       // who receives this notification
  type: notificationTypeEnum('type').notNull(),
  data: json('data').$type<Record<string, unknown>>().default({}),
  isRead: boolean('is_read').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;

// ─── Agent Memory ─────────────────────────────────────────────────────────────

export const agentMemory = pgTable('agent_memory', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  key: text('key').notNull(),
  value: text('value').notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type AgentMemory = typeof agentMemory.$inferSelect;
