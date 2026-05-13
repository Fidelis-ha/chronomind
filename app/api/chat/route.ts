import 'server-only'
import { StreamingTextResponse } from 'ai'
import { cookies } from 'next/headers'

import { auth } from '@/lib/auth'
import { nanoid } from '@/lib/utils'
import { buildSystemPrompt } from '@/lib/ai/system-prompt'
import { getTimeEntries, getUserSettings } from '@/lib/data-store'
import { type UserSettings } from '@/lib/types'

export const runtime = 'edge'

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
  const session = await auth({ cookieStore })

  if (!session?.user) {
    return new Response('Unauthorized', { status: 401 })
  }

  const userId = session.user.id
  const json = await req.json()
  const { messages } = json

  // Fetch user data from in-memory store
  const userSettings = getUserSettings(userId) as UserSettings | null
  const todayEntries = getTimeEntries(userId)

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
  return new StreamingTextResponse(stream)
}
