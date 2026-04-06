import { createClient } from '@supabase/supabase-js'
import { type Database } from '@/lib/db_types'
import { zodSchema } from 'ai'
import { z } from 'zod'
import { cookies } from 'next/headers'
import { auth } from '@/auth'

// Schema für Tool-Parameter
const updateTimeEntryParamsSchema = z.object({
  id: z.string().describe('ID des zu aktualisierenden Eintrags'),
  title: z.string().optional().describe('Neue Bezeichnung'),
  category: z.string().optional().describe('Neue Kategorie'),
  description: z.string().optional().describe('Neue Beschreibung'),
  started_at: z.string().optional().describe('Neue Startzeit als ISO 8601 String'),
  ended_at: z.string().optional().describe('Neue Endzeit als ISO 8601 String, optional')
})

export type UpdateTimeEntryParams = z.infer<typeof updateTimeEntryParamsSchema>

// Tool Definition für Vercel AI SDK v6
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
    const cookieStore = cookies()
    const session = await auth({ cookieStore })

    if (!session?.user) {
      return { success: false, error: 'Nicht authentifiziert' }
    }

    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Prüfen ob der Eintrag existiert und dem User gehört
    const { data: existing, error: fetchError } = await supabase
      .from('time_entries')
      .select('id')
      .eq('id', params.id)
      .eq('user_id', session.user.id)
      .single()

    if (fetchError || !existing) {
      return { success: false, error: 'Eintrag nicht gefunden oder keine Berechtigung' }
    }

    // Update-Objekt erstellen (nur übergebene Felder)
    const updateData: Record<string, any> = {}
    if (params.title !== undefined) updateData.title = params.title
    if (params.category !== undefined) updateData.category = params.category
    if (params.description !== undefined) updateData.description = params.description
    if (params.started_at !== undefined) updateData.started_at = params.started_at
    if (params.ended_at !== undefined) updateData.ended_at = params.ended_at

    const { data, error } = await supabase
      .from('time_entries')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return { success: false, error: error.message }
    }

    return { success: true, entry: data }
  } catch (err) {
    console.error('Update time entry error:', err)
    return { success: false, error: 'Fehler beim Aktualisieren des Eintrags' }
  }
}