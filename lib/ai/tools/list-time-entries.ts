import 'server-only'
import { z } from 'zod'
import { cookies } from 'next/headers'
import { auth } from '@/lib/auth'
import { getTimeEntries } from '@/lib/data-store'

// Schema für Tool-Parameter
export const listTimeEntriesParams = z.object({
  date: z.string().optional().describe('Datum im ISO Format (YYYY-MM-DD), Standard: heute')
})

export type ListTimeEntriesParams = z.infer<typeof listTimeEntriesParams>

// Tool Definition für Vercel AI SDK
export const listTimeEntriesTool = {
  name: 'list_time_entries',
  description: 'Listet Zeiteinträge auf. Nutze dieses Tool um die bisherigen Einträge anzuzeigen oder zu überprüfen.',
  parameters: listTimeEntriesParams,
  execute: async (params: ListTimeEntriesParams) => {
    return await listTimeEntriesAction(params)
  }
}

export async function listTimeEntriesAction(params: ListTimeEntriesParams): Promise<{ success: boolean; entries?: any[]; error?: string }> {
  try {
    const cookieStore = cookies()
    const session = await auth({ cookieStore })

    if (!session?.user) {
      return { success: false, error: 'Nicht authentifiziert' }
    }

    const entries = getTimeEntries(session.user.id, params.date)
    return { success: true, entries }
  } catch (err) {
    console.error('List time entries error:', err)
    return { success: false, error: 'Fehler beim Laden der Einträge' }
  }
}
