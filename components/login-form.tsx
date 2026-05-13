'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { IconSpinner } from '@/components/ui/icons'
import { Input } from './ui/input'
import { Label } from './ui/label'
import Link from 'next/link'
import { toast } from 'react-hot-toast'
import { useRouter } from 'next/navigation'

interface LoginFormProps extends React.ComponentPropsWithoutRef<'div'> {
  action: 'sign-in' | 'sign-up'
}

export function LoginForm({
  className,
  action = 'sign-in',
  ...props
}: LoginFormProps) {
  const [isLoading, setIsLoading] = React.useState(false)
  const router = useRouter()

  const [formState, setFormState] = React.useState({
    email: '',
    password: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    const endpoint = action === 'sign-in' ? '/api/auth/sign-in' : '/api/auth/sign-up'

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formState)
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Ein Fehler ist aufgetreten')
        return
      }

      if (action === 'sign-up' && !data.session) {
        toast.success('Registrierung erfolgreich! Bitte melde dich an.')
        router.push('/sign-in')
        return
      }

      router.refresh()
    } catch (err) {
      toast.error('Ein Fehler ist aufgetreten')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div {...props}>
      <form onSubmit={handleSubmit}>
        <fieldset className="flex flex-col gap-y-4">
          <div className="flex flex-col gap-y-1">
            <Label>E-Mail</Label>
            <Input
              name="email"
              type="email"
              value={formState.email}
              onChange={e =>
                setFormState(prev => ({
                  ...prev,
                  email: e.target.value
                }))
              }
            />
          </div>
          <div className="flex flex-col gap-y-1">
            <Label>Passwort</Label>
            <Input
              name="password"
              type="password"
              value={formState.password}
              onChange={e =>
                setFormState(prev => ({
                  ...prev,
                  password: e.target.value
                }))
              }
            />
          </div>
        </fieldset>

        <div className="mt-4 flex items-center">
          <Button disabled={isLoading}>
            {isLoading && <IconSpinner className="mr-2 animate-spin" />}
            {action === 'sign-in' ? 'Anmelden' : 'Registrieren'}
          </Button>
          <p className="ml-4">
            {action === 'sign-in' ? (
              <>
                Noch kein Konto?{' '}
                <Link href="/sign-up" className="font-medium">
                  Registrieren
                </Link>
              </>
            ) : (
              <>
                Bereits ein Konto?{' '}
                <Link href="/sign-in" className="font-medium">
                  Anmelden
                </Link>
              </>
            )}
          </p>
        </div>
      </form>
    </div>
  )
}
