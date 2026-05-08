import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import DashboardClient from './DashboardClient'

export default async function DashboardPage() {
  const { user } = (await auth()) || {}

  if (!user) {
    redirect('/sign-in')
  }

  return <DashboardClient userId={user.id} />
}
