'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { IconSpinner } from '@/components/ui/icons'
import { MdTextField } from '@/components/m3/md-text-field'
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

      if (action === 'sign-in') {
        console.log('Sign-in successful, redirecting to /app_main')
        router.push('/app_main')
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
    <div
      className="mx-auto w-full max-w-sm rounded-[28px] border border-outline-variant bg-surface-container-low p-8"
      {...props}
    >
      <h1 className="mb-6 text-center text-2xl font-bold text-on-surface">
        {action === 'sign-in' ? 'Anmelden' : 'Registrieren'}
      </h1>
      <form onSubmit={handleSubmit}>
        <fieldset className="flex flex-col gap-y-4">
          <MdTextField
            name="email"
            type="email"
            label="E-Mail"
            value={formState.email}
            onInput={value =>
              setFormState(prev => ({
                ...prev,
                email: value
              }))
            }
            required
            autoComplete="email"
          />
          <MdTextField
            name="password"
            type="password"
            label="Passwort"
            value={formState.password}
            onInput={value =>
              setFormState(prev => ({
                ...prev,
                password: value
              }))
            }
            required
            autoComplete="current-password"
          />
        </fieldset>

        <div className="mt-6 flex flex-col items-center gap-3">
          <md-filled-button
            type="submit"
            disabled={isLoading}
            class="w-full"
          >
            {isLoading && <IconSpinner className="mr-2 animate-spin" />}
            {action === 'sign-in' ? 'Anmelden' : 'Registrieren'}
          </md-filled-button>
          <p className="text-sm text-on-surface-variant">
            {action === 'sign-in' ? (
              <>
                Noch kein Konto?{' '}
                <Link
                  href="/sign-up"
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  Registrieren
                </Link>
              </>
            ) : (
              <>
                Bereits ein Konto?{' '}
                <Link
                  href="/sign-in"
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
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
