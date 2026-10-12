import type { Metadata } from 'next'
import TaktDemo from '@/components/design-demo/Takt'

export const metadata: Metadata = { title: 'Chronomind · Takt' }

export default function Page() {
  return <TaktDemo />
}
