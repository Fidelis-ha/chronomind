import 'server-only'
import { z } from 'zod'
import { cookies } from 'next/headers'
import { auth } from '@/lib/auth'
import { updateTimeEntry } from '@/lib/data-store'

// Schema für Tool-Parameter
export const updateTimeEntryParams = z.object({
  id: z.string().describe('ID des zu aktualisierenden Eintrags'),
  title: z.string().optional().describe('Neue Bezeichnung'),
  category: z.string().optional().describe('Neue Kategorie'),
  description: z.string().optional().describe('Neue Beschreibung'),
  started_at: z.string().optional().describe('Neue Startzeit als ISO 8601 String'),
  ended_at: z.string().optional().describe('Neue Endzeit als ISO 8601 String, optional')
})

export type UpdateTimeEntryParams = z.infer<typeof updateTimeEntryParams>

// Tool Definition für Vercel AI SDK
export const updateTimeEntryTool = {
  name: 'update_time_entry',
  description: 'Aktualisiert einen bestehenden Zeiteintrag. Nutze dieses Tool wenn der Benutzer einen bestehenden Eintrag bearbeiten möchte.',
  parameters: updateTimeEntryParams,
  execute: async (params: UpdateTimeEntryParams) => {
    return await updateTimeEntryAction(params)
  }
}

export async function updateTimeEntryAction(params: UpdateTimeEntryParams): Promise<{ success: boolean; entry?: any; error?: string }> {
  try {
    const cookieStore = cookies()
    const session = await auth({ cookieStore })

    if (!session?.user) {
      return { success: false, error: 'Nicht authentifiziert' }
    }

    const entry = updateTimeEntry(session.user.id, params.id, {
      title: params.title,
      category: params.category,
      description: params.description,
      started_at: params.started_at,
      ended_at: params.ended_at
    })

    if (!entry) {
      return { success: false, error: 'Eintrag nicht gefunden oder keine Berechtigung' }
    }

    return { success: true, entry }
  } catch (err) {
    console.error('Update time entry error:', err)
    return { success: false, error: 'Fehler beim Aktualisieren des Eintrags' }
  }
}
