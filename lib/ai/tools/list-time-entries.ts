import { createClient } from '@supabase/supabase-js'
import { type Database } from '@/lib/db_types'
import { zodSchema } from 'ai'
import { z } from 'zod'
import { cookies } from 'next/headers'
import { auth } from '@/auth'

// Schema für Tool-Parameter
const listTimeEntriesParamsSchema = z.object({
  date: z.string().optional().describe('Datum im ISO Format (YYYY-MM-DD), Standard: heute'),
  limit: z.number().optional().describe('Maximale Anzahl an Einträgen, Standard: 20')
})

export type ListTimeEntriesParams = z.infer<typeof listTimeEntriesParamsSchema>

// Tool Definition für Vercel AI SDK v6
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
    const cookieStore = cookies()
    const session = await auth({ cookieStore })

    if (!session?.user) {
      return { success: false, error: 'Nicht authentifiziert' }
    }

    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Datum parsen
    const targetDate = params.date
      ? new Date(params.date)
      : new Date()
    targetDate.setHours(0, 0, 0, 0)

    const nextDay = new Date(targetDate)
    nextDay.setDate(nextDay.getDate() + 1)

    const { data, error } = await supabase
      .from('time_entries')
      .select('*')
      .eq('user_id', session.user.id)
      .gte('started_at', targetDate.toISOString())
      .lt('started_at', nextDay.toISOString())
      .order('started_at', { ascending: false })
      .limit(params.limit || 20)

    if (error) {
      console.error('Database error:', error)
      return { success: false, error: error.message }
    }

    return { success: true, entries: data || [] }
  } catch (err) {
    console.error('List time entries error:', err)
    return { success: false, error: 'Fehler beim Laden der Einträge' }
  }
}
