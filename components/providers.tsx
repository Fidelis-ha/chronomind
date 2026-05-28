'use client'

import * as React from 'react'
import { ThemeProvider as NextThemesProvider } from 'next-themes'
import { ThemeProviderProps } from 'next-themes/dist/types'

import { TooltipProvider } from '@/components/ui/tooltip'

const THEME_STORAGE_KEY = 'chronomind_theme'

export function Providers({ children, ...props }: ThemeProviderProps) {
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
    // Sync theme from localStorage on mount
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY)
    if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
      document.documentElement.setAttribute('data-theme', savedTheme)
    }
  }, [])

  if (!mounted) {
    return <TooltipProvider>{children}</TooltipProvider>
  }

  return (
    <NextThemesProvider {...props}>
      <TooltipProvider>{children}</TooltipProvider>
    </NextThemesProvider>
  )
}

// Expose theme setter globally for settings page
if (typeof window !== 'undefined') {
  (window as any).__setThemePreference = (theme: string) => {
    localStorage.setItem(THEME_STORAGE_KEY, theme)
    document.documentElement.setAttribute('data-theme', theme)
  }
}
