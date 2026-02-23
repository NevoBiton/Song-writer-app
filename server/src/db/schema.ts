import { pgTable, uuid, text, integer, json, timestamp } from 'drizzle-orm/pg-core';

// Users are managed by Supabase Auth — no local users table needed.
// Supabase user UUIDs are stored directly in songs.

export const songs = pgTable('songs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  title: text('title').notNull(),
  artist: text('artist'),
  key: text('key'),
  capo: integer('capo').default(0),
  language: text('language').default('en'),
  sections: json('sections').default([]),
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
