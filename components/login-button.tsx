'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'

import { cn } from '@/lib/utils'
import { Button, type ButtonProps } from '@/components/ui/button'

interface LoginButtonProps extends ButtonProps {
  showGithubIcon?: boolean
  text?: string
}

// Deprecated: GitHub OAuth ist nicht mehr verfügbar
export function LoginButton({
  text = 'Anmelden',
  showGithubIcon = false,
  className,
  ...props
}: LoginButtonProps) {
  const router = useRouter()

  return (
    <Button
      variant="outline"
      onClick={() => router.push('/sign-in')}
      className={cn(className)}
      {...props}
    >
      {text}
    </Button>
  )
}
