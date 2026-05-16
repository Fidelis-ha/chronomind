import { AppLayout } from '@/components/app-layout'
import { Chat } from '@/components/chat'

export default function ChatPage() {
  return (
    <AppLayout>
      <div className="flex h-[calc(100vh-4rem)]">
        <div className="flex-1">
          <Chat />
        </div>
      </div>
    </AppLayout>
  )
}