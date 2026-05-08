import { createClient } from '@supabase/supabase-js'
import { type Database } from '@/lib/db_types'
import { z } from 'zod'
import { cookies } from 'next/headers'
import { auth } from '@/auth'

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
    return await createTimeEntry(params)
  }
}

export async function createTimeEntry(params: CreateTimeEntryParams): Promise<{ success: boolean; entry?: any; error?: string }> {
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

    const entryData = {
      user_id: session.user.id,
      title: params.title,
      category: params.category || null,
      description: params.description || null,
      started_at: params.started_at,
      ended_at: params.ended_at || null,
      source: 'ai_chat'
    }

    const { data, error } = await supabase
      .from('time_entries')
      .insert(entryData as any)
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return { success: false, error: error.message }
    }

    return { success: true, entry: data }
  } catch (err) {
    console.error('Create time entry error:', err)
    return { success: false, error: 'Fehler beim Erstellen des Eintrags' }
  }
}