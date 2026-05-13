import 'server-only'
import { z } from 'zod'
import { cookies } from 'next/headers'
import { auth } from '@/lib/auth'
import { createTimeEntry } from '@/lib/data-store'

// Schema für Tool-Parameter
export const createTimeEntryParams = z.object({
  title: z.string().describe('Bezeichnung der Tätigkeit'),
  category: z.string().optional().describe('Kategorie z.B. Arbeit, Meeting, Pause, Privat'),
  description: z.string().optional().describe('Optionale Beschreibung'),
  started_at: z.string().describe('Startzeit als ISO 8601 String'),
  ended_at: z.string().optional().describe('Endzeit als ISO 8601 String, optional wenn noch aktiv')
})

export type CreateTimeEntryParams = z.infer<typeof createTimeEntryParams>

// Tool Definition für Vercel AI SDK
export const createTimeEntryTool = {
  name: 'create_time_entry',
  description: 'Erstellt einen neuen Zeiteintrag in der Datenbank. Nutze dieses Tool wenn der Benutzer einen neuen Zeiteintrag erstellen möchte.',
  parameters: createTimeEntryParams,
  execute: async (params: CreateTimeEntryParams) => {
    return await createTimeEntryAction(params)
  }
}

export async function createTimeEntryAction(params: CreateTimeEntryParams): Promise<{ success: boolean; entry?: any; error?: string }> {
  try {
    const cookieStore = cookies()
    const session = await auth({ cookieStore })

    if (!session?.user) {
      return { success: false, error: 'Nicht authentifiziert' }
    }

    const entry = createTimeEntry(session.user.id, {
      title: params.title,
      category: params.category || null,
      description: params.description || null,
      started_at: params.started_at,
      ended_at: params.ended_at || null,
      source: 'ai_chat',
      tags: null,
      calendar_event_id: null,
      metadata: null
    })

    return { success: true, entry }
  } catch (err) {
    console.error('Create time entry error:', err)
    return { success: false, error: 'Fehler beim Erstellen des Eintrags' }
  }
}
