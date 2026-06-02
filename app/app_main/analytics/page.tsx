import { AppLayout } from '@/components/app-layout'
import { AnalyticsClient } from './AnalyticsClient'

export default async function AnalyticsPage() {
  return (
    <AppLayout>
      <AnalyticsClient />
    </AppLayout>
  )
}