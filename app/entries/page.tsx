import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { AppLayout } from '@/components/app-layout'
import { EntriesClient } from '@/app/app_main/entries/EntriesClient'

export default async function EntriesPage() {
  const { user } = (await auth()) || {}
  if (!user) redirect('/sign-in')

  return (
    <AppLayout user={user}>
      <EntriesClient />
    </AppLayout>
  )
}