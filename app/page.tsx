import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'

export default async function IndexPage() {
  const cookieStore = cookies()
  const session = await auth({ cookieStore })

  if (session?.user) {
    redirect('/')
  }

  return (
    <div className="container flex min-h-screen flex-col items-center justify-center py-16">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">ChronoMind</h1>
        <p className="text-muted-foreground text-lg">
          KI-gestützte Zeiterfassung
        </p>
        <div className="flex gap-4 justify-center pt-8">
          <a
            href="/sign-in"
            className="px-6 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Anmelden
          </a>
          <a
            href="/sign-up"
            className="px-6 py-3 border border-input bg-background rounded-md hover:bg-muted"
          >
            Registrieren
          </a>
        </div>
      </div>
    </div>
  )
}