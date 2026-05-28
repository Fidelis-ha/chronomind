import { zodSchema } from 'ai'
import { z } from 'zod'
import { getSession } from '@/lib/auth/session'
import { localDb } from '@/lib/db/local'

const createTimeEntryParamsSchema = z.object({
  title: z.string().describe('Bezeichnung der Tätigkeit'),
  category: z.string().optional().describe('Kategorie z.B. Arbeit, Meeting, Pause, Privat'),
  description: z.string().optional().describe('Optionale Beschreibung'),
  started_at: z.string().describe('Startzeit als ISO 8601 String'),
  ended_at: z.string().optional().describe('Endzeit als ISO 8601 String, optional wenn noch aktiv'),
  is_recurring: z.boolean().optional().describe('Ob der Eintrag wiederkehrend ist'),
  recurrence_rule: z.object({
    frequency: z.enum(['daily', 'weekly']),
    interval: z.number().default(1),
    endDate: z.string().nullable().optional(),
    count: z.number().nullable().optional()
  }).optional().describe('Wiederholungsregel wenn is_recurring true ist')
})

export type CreateTimeEntryParams = z.infer<typeof createTimeEntryParamsSchema>

export const createTimeEntryTool = {
  name: 'create_time_entry',
  description: 'Erstellt einen neuen Zeiteintrag in der Datenbank. Nutze dieses Tool wenn der Benutzer einen neuen Zeiteintrag erstellen möchte.',
  inputSchema: zodSchema(createTimeEntryParamsSchema),
  execute: async (params: CreateTimeEntryParams) => {
    return await createTimeEntry(params)
  }
}

export async function createTimeEntry(params: CreateTimeEntryParams): Promise<{ success: boolean; entry?: any; error?: string }> {
  try {
    const session = await getSession()

    if (!session?.id) {
      return { success: false, error: 'Nicht authentifiziert' }
    }

    const id = crypto.randomUUID()
    const entryData = {
      id,
      userId: session.id,
      title: params.title,
      category: params.category || null,
      description: params.description || null,
      startedAt: params.started_at,
      endedAt: params.ended_at || null,
      source: 'ai_chat',
      createdAt: Math.floor(Date.now() / 1000),
      isRecurring: params.is_recurring ? 1 : null,
      recurrenceRule: params.recurrence_rule ? JSON.stringify(params.recurrence_rule) : null,
      recurrenceParentId: null,
      recurrenceIndex: 0
    }

    await localDb.timeEntries.create(entryData)

    const [entry] = await localDb.timeEntries.findById(id)

    return { success: true, entry }
  } catch (err) {
    console.error('Create time entry error:', err)
    return { success: false, error: 'Fehler beim Erstellen des Eintrags' }
  }
}
