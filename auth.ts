import 'server-only'
import { getSession } from '@/lib/auth/session'

export const auth = async () => {
  const session = await getSession()
  if (!session) return null
  return { session, user: session }
}
