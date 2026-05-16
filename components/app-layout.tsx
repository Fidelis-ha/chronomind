import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { Header } from '@/components/header'

export function AppLayout({ user, children }: { user: { id: string; email?: string }; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 flex flex-col bg-muted/50">
        {children}
      </main>
    </div>
  )
}