'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { IconExternalLink } from '@/components/ui/icons'

// Accept our simpler JWT auth user type
export interface JwtUser {
  id: string
  email: string
  name?: string
  user_metadata?: { name?: string; avatar_url?: string }
}

export interface UserMenuProps {
  user: JwtUser | null
}

function getUserInitials(name?: string, email?: string) {
  if (name) {
    const [firstName, lastName] = name.split(' ')
    return lastName ? `${firstName[0]}${lastName[0]}` : firstName.slice(0, 2)
  }
  if (email) return email.slice(0, 2).toUpperCase()
  return '??'
}

function getDisplayName(user?: JwtUser) {
  return user?.user_metadata?.name ?? user?.name ?? user?.email ?? '👋🏼'
}

export function UserMenu({ user }: UserMenuProps) {
  const router = useRouter()

  const signOut = async () => {
    // Delete the chronomind-session cookie
    document.cookie = 'chronomind-session=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT'
    router.refresh()
  }

  return (
    <div className="flex items-center justify-between">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="pl-0">
            <div className="flex h-7 w-7 shrink-0 select-none items-center justify-center rounded-full bg-muted/50 text-xs font-medium uppercase text-muted-foreground">
              {getUserInitials(user?.user_metadata?.name ?? user?.name, user?.email)}
            </div>
            <span className="ml-2">{getDisplayName(user)}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent sideOffset={8} align="start" className="w-[180px]">
          <DropdownMenuItem className="flex-col items-start">
            <div className="text-xs font-medium">
              {user?.user_metadata?.name ?? user?.name ?? 'User'}
            </div>
            <div className="text-xs text-zinc-500">{user?.email}</div>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <a
              href="https://vercel.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full items-center justify-between text-xs"
            >
              Vercel Homepage
              <IconExternalLink className="ml-auto h-3 w-3" />
            </a>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={signOut} className="text-xs cursor-pointer">
            Log Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}