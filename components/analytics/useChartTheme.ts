'use client'

import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'

/** Liefert einen Zähler, der sich bei jedem Theme-Wechsel erhöht → Charts re-rendern. */
export function useChartThemeVersion(): number {
  const { resolvedTheme } = useTheme()
  const [mediaTheme, setMediaTheme] = useState<string | null>(null)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = (e: MediaQueryListEvent) => setMediaTheme(e.matches ? 'dark' : 'light')
    mq.addEventListener('change', onChange)
    setMediaTheme(mq.matches ? 'dark' : 'light')
    return () => mq.removeEventListener('change', onChange)
  }, [])

  return `${resolvedTheme ?? ''}|${mediaTheme ?? ''}` === ''
    ? 0
    : hashCode(`${resolvedTheme ?? ''}|${mediaTheme ?? ''}`)
}

function hashCode(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i)
    h |= 0
  }
  return Math.abs(h)
}
