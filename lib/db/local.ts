import { db } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { users, chats, timeEntries, userSettings, calendars, calendarEvents } from '@/lib/db/schema'
import type { TimeEntry, UserSettings, Chat } from '@/lib/types'

export const localDb = {
  users: {
    findById: (id: string) => db.select().from(users).where(eq(users.id, id)).limit(1),
    findByEmail: (email: string) => db.select().from(users).where(eq(users.email, email)).limit(1),
    create: (data: typeof users.$inferInsert) => db.insert(users).values(data),
    delete: (id: string) => db.delete(users).where(eq(users.id, id))
  },

  timeEntries: {
    findByUserAndDate: (userId: string, date: Date) => {
      const startOfDay = new Date(date)
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(date)
      endOfDay.setHours(23, 59, 59, 999)

      return db
        .select()
        .from(timeEntries)
        .where(eq(timeEntries.userId, userId))
        .orderBy(timeEntries.startedAt)
    },

    findById: (id: string) => db.select().from(timeEntries).where(eq(timeEntries.id, id)).limit(1),

    create: (data: typeof timeEntries.$inferInsert) => db.insert(timeEntries).values(data),

    update: (id: string, data: Partial<typeof timeEntries.$inferInsert>) =>
      db.update(timeEntries).set(data).where(eq(timeEntries.id, id)),

    delete: (id: string) => db.delete(timeEntries).where(eq(timeEntries.id, id)),

    findByDateRange: (userId: string, start: Date, end: Date) =>
      db
        .select()
        .from(timeEntries)
        .where(eq(timeEntries.userId, userId)),

    findAllByUser: (userId: string) =>
      db
        .select()
        .from(timeEntries)
        .where(eq(timeEntries.userId, userId))
        .orderBy(timeEntries.startedAt)
  },

  chats: {
    findByUser: (userId: string) =>
      db.select().from(chats).where(eq(chats.userId, userId)),

    findById: (id: string) => db.select().from(chats).where(eq(chats.id, id)).limit(1),

    create: (data: typeof chats.$inferInsert) => db.insert(chats).values(data),

    update: (id: string, data: Partial<typeof chats.$inferInsert>) =>
      db.update(chats).set(data).where(eq(chats.id, id)),

    delete: (id: string) => db.delete(chats).where(eq(chats.id, id)),

    deleteAll: (userId: string) => db.delete(chats).where(eq(chats.userId, userId))
  },

  settings: {
    findByUserId: (userId: string) =>
      db.select().from(userSettings).where(eq(userSettings.userId, userId)).limit(1),

    upsert: (data: typeof userSettings.$inferInsert) =>
      db.insert(userSettings).values(data).onConflictDoUpdate({
        target: userSettings.userId,
        set: {
          aiProvider: data.aiProvider,
          aiModel: data.aiModel,
          aiApiKeyMistral: data.aiApiKeyMistral,
          aiApiKeyRouterlab: data.aiApiKeyRouterlab,
          routerlabBaseUrl: data.routerlabBaseUrl,
          timezone: data.timezone,
          workDayStart: data.workDayStart,
          workDayEnd: data.workDayEnd,
          backupProvider: data.backupProvider,
          backupConfig: data.backupConfig
        }
      })
  },

  calendars: {
    findByUser: (userId: string) =>
      db.select().from(calendars).where(eq(calendars.userId, userId)),

    create: (data: typeof calendars.$inferInsert) => db.insert(calendars).values(data),

    delete: (id: string) => db.delete(calendars).where(eq(calendars.id, id))
  },

  calendarEvents: {
    findByUser: (userId: string) =>
      db.select().from(calendarEvents).where(eq(calendarEvents.userId, userId)),

    create: (data: typeof calendarEvents.$inferInsert) => db.insert(calendarEvents).values(data),

    deleteByCalendar: (calendarId: string) =>
      db.delete(calendarEvents).where(eq(calendarEvents.calendarId, calendarId))
  }
}
