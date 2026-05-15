import 'server-only'
import { getSession } from '@/lib/auth/session'

export async function auth() {
  const session = await getSession()
  if (!session) return null
  return { session, user: session }
}
