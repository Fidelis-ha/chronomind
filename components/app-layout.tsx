import { BottomNav } from '@/components/bottom-nav'

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col">
      <main className="flex-1 flex flex-col bg-muted/50 pb-[calc(3.5rem+env(safe-area-inset-bottom))] md:pb-8">
        {children}
      </main>
      <BottomNav />
    </div>
  )
}