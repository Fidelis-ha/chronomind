import * as React from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export function Header() {
  return (
    <header className="sticky top-0 z-50 flex h-16 w-full shrink-0 items-center justify-between border-b bg-gradient-to-b from-background/10 via-background/50 to-background/80 px-4 backdrop-blur-xl">
      <div className="flex items-center gap-4">
        <Link href="/app_main" className="font-bold text-lg">ChronoMind</Link>
        <nav className="flex items-center gap-1">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/app_main">Heute</Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/app_main/entries">Einträge</Link>
          </Button>
        </nav>
      </div>
    </header>
  )
}