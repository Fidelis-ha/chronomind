import { zodSchema } from 'ai'
import { z } from 'zod'
import { getSession } from '@/lib/auth/session'
import { localDb } from '@/lib/db/local'

const listTimeEntriesParamsSchema = z.object({
  date: z.string().optional().describe('Datum im ISO Format (YYYY-MM-DD), Standard: heute'),
  limit: z.number().optional().describe('Maximale Anzahl an Einträgen, Standard: 20')
})

export type ListTimeEntriesParams = z.infer<typeof listTimeEntriesParamsSchema>

export const listTimeEntriesTool = {
  name: 'list_time_entries',
  description: 'Listet Zeiteinträge auf. Nutze dieses Tool um die bisherigen Einträge anzuzeigen oder zu überprüfen.',
  inputSchema: zodSchema(listTimeEntriesParamsSchema),
  execute: async (params: ListTimeEntriesParams) => {
    return await listTimeEntries(params)
  }
}

export async function listTimeEntries(params: ListTimeEntriesParams): Promise<{ success: boolean; entries?: any[]; error?: string }> {
  try {
    const session = await getSession()

    if (!session?.id) {
      return { success: false, error: 'Nicht authentifiziert' }
    }

    const targetDate = params.date
      ? new Date(params.date)
      : new Date()
    targetDate.setHours(0, 0, 0, 0)

    const nextDay = new Date(targetDate)
    nextDay.setDate(nextDay.getDate() + 1)

    const entries = await localDb.timeEntries.findByUserAndDate(session.id, targetDate)

    return { success: true, entries }
  } catch (err) {
    console.error('List time entries error:', err)
    return { success: false, error: 'Fehler beim Laden der Einträge' }
  }
}
