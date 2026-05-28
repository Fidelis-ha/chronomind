import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: integer('created_at').notNull().$type<number>()
})

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  expiresAt: integer('expires_at').notNull().$type<number>()
})

export const chats = sqliteTable('chats', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  payload: text('payload', { mode: 'json' }).notNull()
})

export const timeEntries = sqliteTable('time_entries', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  title: text('title').notNull(),
  description: text('description'),
  category: text('category'),
  tags: text('tags', { mode: 'json' }),
  startedAt: text('started_at').notNull(),
  endedAt: text('ended_at'),
  durationSeconds: integer('duration_seconds'),
  source: text('source').default('manual'),
  calendarEventId: text('calendar_event_id'),
  metadata: text('metadata', { mode: 'json' }),
  createdAt: integer('created_at').notNull().$type<number>(),
  isRecurring: integer('is_recurring').$type<number | null>(),
  recurrenceRule: text('recurrence_rule'),
  recurrenceParentId: text('recurrence_parent_id'),
  recurrenceIndex: integer('recurrence_index')
})

export const calendars = sqliteTable('calendars', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  name: text('name').notNull(),
  webcalUrl: text('webcal_url').notNull(),
  color: text('color'),
  autoSuggest: integer('auto_suggest', { mode: 'boolean' }).default(true),
  lastSyncedAt: text('last_synced_at'),
  createdAt: integer('created_at').notNull().$type<number>()
})

export const calendarEvents = sqliteTable('calendar_events', {
  id: text('id').primaryKey(),
  calendarId: text('calendar_id').notNull().references(() => calendars.id),
  userId: text('user_id').notNull().references(() => users.id),
  externalId: text('external_id').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  startedAt: text('started_at').notNull(),
  endedAt: text('ended_at'),
  location: text('location'),
  rawIcal: text('raw_ical')
})

export const userSettings = sqliteTable('user_settings', {
  userId: text('user_id').primaryKey().references(() => users.id),
  aiProvider: text('ai_provider').default('mistral'),
  aiModel: text('ai_model').default('mistral-large-latest'),
  aiApiKeyMistral: text('ai_api_key_mistral'),
  aiApiKeyRouterlab: text('ai_api_key_routerlab'),
  routerlabBaseUrl: text('routerlab_base_url').default('https://routerlab.ch/v1'),
  timezone: text('timezone').default('Europe/Berlin'),
  workDayStart: text('work_day_start').default('08:00'),
  workDayEnd: text('work_day_end').default('18:00'),
  backupProvider: text('backup_provider'),
  backupConfig: text('backup_config', { mode: 'json' })
})
