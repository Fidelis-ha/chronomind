import type { Metadata } from 'next'
import BuehneDemo from '@/components/design-demo/Buehne'

export const metadata: Metadata = { title: 'Chronomind · Bühne' }

export default function Page() {
  return <BuehneDemo />
}
