import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { Sidebar } from '@/components/sidebar'
import { SidebarFooter } from '@/components/sidebar-footer'
import { ThemeToggle } from '@/components/theme-toggle'
import { UserMenu } from '@/components/user-menu'
import { IconSeparator } from '@/components/ui/icons'
import Link from 'next/link'

export default async function AppLayout({
  children
}: {
  children: React.ReactNode
}) {
  const cookieStore = cookies()
  const session = await auth({ cookieStore })

  if (!session?.user) {
    redirect('/sign-in')
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar>
        <div className="flex flex-col h-full">
          <div className="p-4 border-b">
            <Link href="/" className="font-bold text-lg">ChronoMind</Link>
          </div>
          <nav className="flex-1 p-4 space-y-2">
            <Link
              href="/"
              className="block px-4 py-2 rounded-md hover:bg-muted"
            >
              Heute
            </Link>
            <Link
              href="/entries"
              className="block px-4 py-2 rounded-md hover:bg-muted"
            >
              Einträge
            </Link>
            <Link
              href="/chat"
              className="block px-4 py-2 rounded-md hover:bg-muted"
            >
              Chat
            </Link>
            <Link
              href="/settings"
              className="block px-4 py-2 rounded-md hover:bg-muted"
            >
              Einstellungen
            </Link>
          </nav>
          <SidebarFooter>
            <ThemeToggle />
          </SidebarFooter>
        </div>
      </Sidebar>
      <div className="flex-1 flex flex-col">
        <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b bg-background px-4">
          <div className="flex items-center">
            <IconSeparator className="h-6 w-6 text-muted-foreground/50" />
            {/* @ts-expect-error - local JWT auth uses simpler user type */}
            <UserMenu user={session.user} />
          </div>
        </header>
        <main className="flex-1">{children}</main>
      </div>
    </div>
  )
}