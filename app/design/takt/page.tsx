'use client'

import dynamic from 'next/dynamic'

// Design-Prototyp: rein clientseitig gerendert (SSR aus), damit die
// zeitabhängigen Demo-Daten niemals Hydration-Mismatches erzeugen.
const TaktDemo = dynamic(() => import('@/components/design-demo/Takt'), { ssr: false })

export default function Page() {
  return <TaktDemo />
}
