import { redirect } from 'next/navigation'
import { auth } from '@/auth'

export default async function RootPage() {
  const { user } = (await auth()) || {}

  if (user) {
    redirect('/app_main')
  } else {
    redirect('/sign-in')
  }
}