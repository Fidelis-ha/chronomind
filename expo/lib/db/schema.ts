// lib/db/schema.ts — Drizzle ORM schema for ChronoMind
// Used by native builds via expo-sqlite + drizzle-orm

import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
})

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  token: text('token').notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull()
})

export const timeEntries = sqliteTable('time_entries', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  title: text('title').notNull(),
  description: text('description'),
  category: text('category'),
  startedAt: text('started_at').notNull(),
  endedAt: text('ended_at'),
  durationSeconds: integer('duration_seconds'),
  source: text('source').default('manual'),
  calendarEventId: text('calendar_event_id'),
  metadata: text('metadata'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
})

export const userSettings = sqliteTable('user_settings', {
  userId: text('user_id').primaryKey().references(() => users.id),
  timezone: text('timezone').default('Europe/Berlin'),
  backupProvider: text('backup_provider').default(''),
  backupConfig: text('backup_config'),
  aiProvider: text('ai_provider').default('mistral'),
  aiApiKey: text('ai_api_key')
})

export const calendarEvents = sqliteTable('calendar_events', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  externalId: text('external_id').notNull(),
  title: text('title').notNull(),
  startDate: integer('start_date').notNull(),
  endDate: integer('end_date'),
  source: text('source').default('local')
})
