import { pgTable, uuid, text, integer, json, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  avatar: text('avatar'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
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
