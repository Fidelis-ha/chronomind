import { Metadata } from 'next'
import type { Viewport } from 'next/dist/lib/metadata/types/extra-types'

import { Toaster } from 'react-hot-toast'

import '@/app/globals.css'
import { fontMono, fontSans } from '@/lib/fonts'
import { cn } from '@/lib/utils'
import { TailwindIndicator } from '@/components/tailwind-indicator'
import { Providers } from '@/components/providers'
import { PwaRegister } from '@/components/pwa-register'
import { Header } from '@/components/header'

export const metadata: Metadata = {
  title: {
    default: 'ChronoMind',
    template: `%s - ChronoMind`
  },
  description: 'KI-gestützte Zeiterfassungs-App',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'ChronoMind'
  },
  viewport: {
    viewportFit: 'cover'
  } satisfies Viewport,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' }
  ],
  icons: {
    icon: '/icons/icon-192.png',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png'
  }
}

interface RootLayoutProps {
  children: React.ReactNode
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body
        className={cn(
          'font-sans antialiased',
          fontSans.variable,
          fontMono.variable
        )}
      >
        <Toaster />
        <PwaRegister />
        <Providers attribute="class" defaultTheme="system" enableSystem>
          <div className="flex min-h-screen flex-col">
            {/* @ts-ignore */}
            <Header />
            <div className="flex flex-1 flex-col bg-muted/50">{children}</div>
          </div>
          <TailwindIndicator />
        </Providers>
      </body>
    </html>
  )
}
