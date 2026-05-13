import * as React from 'react'
import Link from 'next/link'
import { auth } from '@/lib/auth'
import { cookies } from 'next/headers'
import { cn } from '@/lib/utils'
import { Button, buttonVariants } from '@/components/ui/button'
import { UserMenu } from '@/components/user-menu'

export async function Header() {
  const cookieStore = cookies()
  const session = await auth({ cookieStore })

  return (
    <header className="sticky top-0 z-50 flex h-16 w-full shrink-0 items-center justify-between border-b bg-background px-4">
      <div className="flex items-center gap-2">
        <Link href="/" className="font-bold text-lg">ChronoMind</Link>
      </div>
      <div className="flex items-center">
        {session?.user ? (
          <UserMenu user={session.user} />
        ) : (
          <Button variant="link" asChild className="-ml-2">
            <Link href="/sign-in">Anmelden</Link>
          </Button>
        )}
      </div>
    </header>
  )
}
