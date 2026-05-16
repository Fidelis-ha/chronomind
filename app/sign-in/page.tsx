'use client'

import * as React from 'react'
import { LoginForm } from '@/components/login-form'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { IconSpinner } from '@/components/ui/icons'
import Link from 'next/link'
import { toast } from 'react-hot-toast'
import { useRouter } from 'next/navigation'

export default function SignInPage() {
  const [isDemoLoading, setIsDemoLoading] = React.useState(false)
  const router = useRouter()

  const handleDemoLogin = async () => {
    setIsDemoLoading(true)
    try {
      // Use a form POST to /api/auth/demo so browser gets the cookie
      const form = document.createElement('form')
      form.method = 'POST'
      form.action = '/api/auth/demo'
      // Set SameSite=None for cross-origin cookie on Vercel subdomains
      document.body.appendChild(form)
      form.submit()
      // This will trigger a redirect, so the button click ends here
    } catch {
      toast.error('Demo-Login fehlgeschlagen')
      setIsDemoLoading(false)
    }
  }

  return (
    <div className="flex h-[calc(100vh-theme(spacing.16))] flex-col items-center justify-center py-10">
      <div className="w-full max-w-sm">
        <LoginForm action="sign-in" />
        <Separator className="my-4" />
        <Button
          variant="outline"
          className="w-full"
          onClick={handleDemoLogin}
          disabled={isDemoLoading}
        >
          {isDemoLoading && <IconSpinner className="mr-2 animate-spin" />}
          Demo-Login
        </Button>
      </div>
    </div>
  )
}