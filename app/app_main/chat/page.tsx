import { Chat } from '@/components/chat'

export default function ChatPage() {
  return (
    <div className="flex h-[calc(100vh-4rem)]">
      <div className="flex-1">
        <Chat />
      </div>
    </div>
  )
}
