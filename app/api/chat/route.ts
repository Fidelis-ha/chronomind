import 'server-only'
import { StreamingTextResponse } from 'ai'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { Database } from '@/lib/db_types'

import { auth } from '@/auth'
import { nanoid } from '@/lib/utils'
import { buildSystemPrompt } from '@/lib/ai/system-prompt'
import { type UserSettings, type TimeEntry } from '@/lib/types'

export const runtime = 'edge'

async function getTodayEntries(supabase: any, userId: string): Promise<TimeEntry[]> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const { data } = await supabase
    .from('time_entries')
    .select('*')
    .eq('user_id', userId)
    .gte('started_at', today.toISOString())
    .lt('started_at', tomorrow.toISOString())
    .order('started_at', { ascending: false })

  return data || []
}

async function getUserSettings(supabase: any, userId: string): Promise<UserSettings | null> {
  const { data } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', userId)
    .single()

  return data
}

// Simple passthrough stream that converts SSE data chunks to text
function mistralToTextStream(response: Response): ReadableStream<string> {
  const reader = response.body!.getReader()
  const decoder = new TextDecoder()

  return new ReadableStream({
    async pull(controller) {
      const { done, value } = await reader.read()
      if (done) {
        controller.close()
        return
      }
      const chunk = decoder.decode(value, { stream: true })
      // Mistral sends SSE data lines: data: {"choices":[{"delta":{"content":"..."}}]}
      const lines = chunk.split('\n')
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const jsonStr = line.slice(6)
          if (jsonStr === '[DONE]') {
            controller.close()
            return
          }
          try {
            const data = JSON.parse(jsonStr)
            const content = data.choices?.[0]?.delta?.content
            if (content) {
              controller.enqueue(content)
            }
          } catch {
            // skip malformed lines
          }
        }
      }
    }
  })
}

export async function POST(req: Request) {
  const cookieStore = cookies()
  const supabase = createRouteHandlerClient<Database>({
    cookies: () => cookieStore
  })
  const json = await req.json()
  const { messages } = json

  const session = await auth({ cookieStore })

  if (!session?.user) {
    return new Response('Unauthorized', { status: 401 })
  }

  const userId = session.user.id

  const userSettings = await getUserSettings(supabase, userId)
  const todayEntries = await getTodayEntries(supabase, userId)

  const systemPrompt = buildSystemPrompt({
    now: new Date(),
    timezone: userSettings?.timezone || 'Europe/Berlin',
    workStart: userSettings?.work_day_start || '08:00',
    workEnd: userSettings?.work_day_end || '18:00',
    todayEntries,
    todayCalendarEvents: [],
    userSettings: userSettings ?? undefined
  })

  const model = userSettings?.ai_model || 'mistral-large-latest'
  const apiKey = userSettings?.ai_api_key_mistral || process.env.MISTRAL_API_KEY

  const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.map((m: any) => ({ role: m.role, content: m.content }))
      ],
      stream: true
    })
  })

  if (!response.ok) {
    const error = await response.text()
    return new Response(`Mistral API Error: ${error}`, { status: 500 })
  }

  const stream = mistralToTextStream(response)

  const id = json.id ?? nanoid()
  const title = messages[0]?.content?.substring(0, 100) || 'Neuer Chat'

  ;(supabase as any).from('chats').upsert({
    id,
    payload: { id, title, userId, createdAt: Date.now(), path: `/chat/${id}`, messages }
  }).throwOnError()

  return new StreamingTextResponse(stream)
}