import { zodSchema } from 'ai'
import { z } from 'zod'
import { getSession } from '@/lib/auth/session'
import { localDb } from '@/lib/db/local'

const updateTimeEntryParamsSchema = z.object({
  id: z.string().describe('ID des zu aktualisierenden Eintrags'),
  title: z.string().optional().describe('Neue Bezeichnung'),
  category: z.string().optional().describe('Neue Kategorie'),
  description: z.string().optional().describe('Neue Beschreibung'),
  started_at: z.string().optional().describe('Neue Startzeit als ISO 8601 String'),
  ended_at: z.string().optional().describe('Neue Endzeit als ISO 8601 String, optional')
})

export type UpdateTimeEntryParams = z.infer<typeof updateTimeEntryParamsSchema>

export const updateTimeEntryTool = {
  name: 'update_time_entry',
  description: 'Aktualisiert einen bestehenden Zeiteintrag. Nutze dieses Tool wenn der Benutzer einen bestehenden Eintrag bearbeiten möchte.',
  inputSchema: zodSchema(updateTimeEntryParamsSchema),
  execute: async (params: UpdateTimeEntryParams) => {
    return await updateTimeEntry(params)
  }
}

export async function updateTimeEntry(params: UpdateTimeEntryParams): Promise<{ success: boolean; entry?: any; error?: string }> {
  try {
    const session = await getSession()

    if (!session?.id) {
      return { success: false, error: 'Nicht authentifiziert' }
    }

    const [existing] = await localDb.timeEntries.findById(params.id)

    if (!existing || existing.userId !== session.id) {
      return { success: false, error: 'Eintrag nicht gefunden oder keine Berechtigung' }
    }

    const updateData: Record<string, any> = {}
    if (params.title !== undefined) updateData.title = params.title
    if (params.category !== undefined) updateData.category = params.category
    if (params.description !== undefined) updateData.description = params.description
    if (params.started_at !== undefined) updateData.startedAt = params.started_at
    if (params.ended_at !== undefined) updateData.endedAt = params.ended_at

    await localDb.timeEntries.update(params.id, updateData)

    const [entry] = await localDb.timeEntries.findById(params.id)

    return { success: true, entry }
  } catch (err) {
    console.error('Update time entry error:', err)
    return { success: false, error: 'Fehler beim Aktualisieren des Eintrags' }
  }
}
