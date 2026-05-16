import { AppLayout } from '@/components/app-layout'
import DashboardClient from './DashboardClient'

export default async function DashboardPage() {
  return (
    <AppLayout>
      <DashboardClient />
    </AppLayout>
  )
}