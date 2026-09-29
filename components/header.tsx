'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { ThemeToggle } from '@/components/theme-toggle'

const navItems = [
  { href: '/app_main', label: 'Heute', exact: true },
  { href: '/app_main/entries', label: 'Einträge', exact: false },
  { href: '/app_main/analytics', label: 'Auswertung', exact: false },
  { href: '/app_main/chat', label: 'Chat', exact: false },
  { href: '/app_main/calendar', label: 'Kalender', exact: false },
  { href: '/app_main/settings', label: 'Einstellungen', exact: false }
]

export function Header() {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-50 flex h-16 w-full shrink-0 items-center justify-between bg-surface px-4">
      <div className="flex items-center gap-4">
        <Link
          href="/app_main"
          className="text-lg font-bold text-on-surface transition-colors duration-200"
        >
          ChronoMind
        </Link>
        <nav className="hidden items-center gap-1 md:flex" aria-label="Haupt">
          {navItems.map(item => {
            const active =
              pathname === item.href ||
              (!item.exact && pathname.startsWith(item.href + '/'))
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-medium transition-colors duration-200',
                  active
                    ? 'bg-secondary-container text-on-secondary-container'
                    : 'text-on-surface-variant hover:bg-on-surface/[0.08] hover:text-on-surface'
                )}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>
      </div>
      <div className="flex items-center gap-2">
        <ThemeToggle />
      </div>
    </header>
  )
}
