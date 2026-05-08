'use server'
import 'server-only'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { localDb } from '@/lib/db/local'
import type { Chat } from '@/lib/types'

export async function getChats() {
  const session = await getSession()
  if (!session?.id) return []

  try {
    const chats = await localDb.chats.findByUser(session.id)
    return chats.map(c => c.payload as Chat)
  } catch {
    return []
  }
}

export async function getChat(id: string) {
  const session = await getSession()
  if (!session?.id) return null

  try {
    const [chat] = await localDb.chats.findById(id)
    if (!chat || chat.userId !== session.id) return null
    return chat.payload as Chat
  } catch {
    return null
  }
}

export async function getSharedChat(id: string) {
  return null
}

export async function removeChat({ id, path }: { id: string; path: string }) {
  try {
    const session = await getSession()
    if (!session?.id) return { error: 'Unauthorized' }

    const [chat] = await localDb.chats.findById(id)
    if (!chat || chat.userId !== session.id) return { error: 'Unauthorized' }

    await localDb.chats.delete(id)
    revalidatePath('/')
    return revalidatePath(path)
  } catch {
    return { error: 'Unauthorized' }
  }
}

export async function clearChats() {
  try {
    const session = await getSession()
    if (!session?.id) return { error: 'Unauthorized' }

    await localDb.chats.deleteAll(session.id)
    revalidatePath('/')
    return redirect('/')
  } catch {
    return { error: 'Unauthorized' }
  }
}

export async function saveChat(chat: Chat) {
  const session = await getSession()
  if (!session?.id) return null

  try {
    const [existing] = await localDb.chats.findById(chat.id)
    if (existing) {
      await localDb.chats.update(chat.id, { payload: chat })
    } else {
      await localDb.chats.create({
        id: chat.id,
        userId: session.id,
        payload: chat
      })
    }
    return chat
  } catch {
    return null
  }
}
