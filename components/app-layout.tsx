import { Header } from '@/components/header'

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 flex flex-col bg-muted/50">
        {children}
      </main>
    </div>
  )
}