'use client'

import * as React from 'react'
import { LoginForm } from '@/components/login-form'
import { Separator } from '@/components/separator'
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
      const res = await fetch('/api/auth/demo', { method: 'POST' })
      const data = await res.json()
      
      if (!res.ok) {
        toast.error(data.error || 'Demo-Login fehlgeschlagen')
        return
      }
      
      toast.success('Demo-Login erfolgreich!')
      router.push('/app_main')
    } catch {
      toast.error('Demo-Login fehlgeschlagen')
    } finally {
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