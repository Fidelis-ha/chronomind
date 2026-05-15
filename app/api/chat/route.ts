import 'server-only'
import { NextResponse } from 'next/server'
import { streamText, convertToModelMessages } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { createMistral } from '@ai-sdk/mistral'
import { auth } from '@/auth'
import { nanoid } from '@/lib/utils'
import { buildSystemPrompt } from '@/lib/ai/system-prompt'
import { createTimeEntryTool } from '@/lib/ai/tools/create-time-entry'
import { listTimeEntriesTool } from '@/lib/ai/tools/list-time-entries'
import { updateTimeEntryTool } from '@/lib/ai/tools/update-time-entry'
import { localDb } from '@/lib/db/local'
import type { UserSettings, TimeEntry } from '@/lib/types'

function getAIProvider(userSettings: UserSettings | null) {
  if (userSettings?.ai_provider === 'routerlab') {
    return createOpenAI({
      baseURL: userSettings.routerlab_base_url || process.env.ROUTERLAB_BASE_URL,
      apiKey: userSettings?.ai_api_key_routerlab || process.env.ROUTERLAB_API_KEY
    })
  }
  return createMistral({
    apiKey: userSettings?.ai_api_key_mistral || process.env.MISTRAL_API_KEY
  })
}

function getModel(userSettings: UserSettings | null): string {
  return userSettings?.ai_model || 'mistral-large-latest'
}

function getAIErrorMessage(userSettings: UserSettings | null): string | null {
  if (userSettings?.ai_provider === 'routerlab') {
    if (!userSettings?.ai_api_key_routerlab && !process.env.ROUTERLAB_API_KEY) {
      return 'RouterLab API Key nicht konfiguriert. Bitte in den Einstellungen eintragen.'
    }
  } else {
    if (!userSettings?.ai_api_key_mistral && !process.env.MISTRAL_API_KEY) {
      return 'Mistral API Key nicht konfiguriert. Bitte in den Einstellungen eintragen.'
    }
  }
  return null
}

async function getTodayEntries(userId: string): Promise<TimeEntry[]> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const entries = await localDb.timeEntries.findByUserAndDate(userId, today)

  return entries.map(e => ({
    id: e.id,
    user_id: e.userId,
    title: e.title,
    description: e.description,
    category: e.category,
    tags: (e.tags || null) as string[] | null,
    started_at: e.startedAt,
    ended_at: e.endedAt,
    duration_seconds: e.durationSeconds,
    source: e.source as TimeEntry['source'],
    calendar_event_id: e.calendarEventId,
    metadata: (e.metadata || null) as Record<string, unknown> | null,
    created_at: e.createdAt ? new Date(e.createdAt * 1000).toISOString() : new Date().toISOString()
  }))
}

async function getUserSettings(userId: string): Promise<UserSettings | null> {
  const [settings] = await localDb.settings.findByUserId(userId)

  if (!settings) return null

  return {
    user_id: settings.userId,
    ai_provider: settings.aiProvider as UserSettings['ai_provider'],
    ai_model: settings.aiModel,
    ai_api_key_mistral: settings.aiApiKeyMistral,
    ai_api_key_routerlab: settings.aiApiKeyRouterlab,
    routerlab_base_url: settings.routerlabBaseUrl,
    timezone: settings.timezone,
    work_day_start: settings.workDayStart,
    work_day_end: settings.workDayEnd,
    backup_provider: settings.backupProvider,
    backup_config: (settings.backupConfig || null) as UserSettings['backup_config']
  }
}

export async function POST(req: Request) {
  const json = await req.json()
  const { messages } = json

  const { user } = (await auth()) || {}

  if (!user) {
    return new Response('Unauthorized', {
      status: 401
    })
  }

  const userId = user.id

  const userSettings = await getUserSettings(userId)
  const todayEntries = await getTodayEntries(userId)

  const systemPrompt = buildSystemPrompt({
    now: new Date(),
    timezone: userSettings?.timezone || 'Europe/Berlin',
    workStart: userSettings?.work_day_start || '08:00',
    workEnd: userSettings?.work_day_end || '18:00',
    todayEntries,
    todayCalendarEvents: [],
    userSettings: userSettings || undefined
  })

  const provider = getAIProvider(userSettings)
  const model = getModel(userSettings)

  const aiError = getAIErrorMessage(userSettings)
  if (aiError) {
    return NextResponse.json({ error: aiError }, { status: 400 })
  }

  const coreMessages = await convertToModelMessages(messages)

  const result = await streamText({
    model: provider(model),
    system: systemPrompt,
    messages: coreMessages,
    tools: {
      create_time_entry: createTimeEntryTool,
      list_time_entries: listTimeEntriesTool,
      update_time_entry: updateTimeEntryTool
    }
  })

  return result.toTextStreamResponse()
}
