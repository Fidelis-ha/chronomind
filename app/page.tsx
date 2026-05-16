import { redirect } from 'next/navigation'
import DashboardClient from '@/app/app_main/DashboardClient'

export default async function RootPage() {
  redirect('/app_main')
}