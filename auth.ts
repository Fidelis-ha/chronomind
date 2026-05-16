// Auth disabled — localStorage-based auth
export interface User {
  id: string
  email: string
}

export interface Session {
  user: User
}

export async function auth(): Promise<Session | null> {
  return null
}