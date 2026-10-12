import type { Metadata } from 'next'
import AgendaDemo from '@/components/design-demo/Agenda'

export const metadata: Metadata = { title: 'Chronomind · Agenda' }

export default function Page() {
  return <AgendaDemo />
}
