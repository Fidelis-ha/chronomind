import { AppLayout } from '@/components/app-layout'
import { EntriesClient } from './EntriesClient'

export default function EntriesPage() {
  return (
    <AppLayout>
      <EntriesClient />
    </AppLayout>
  )
}