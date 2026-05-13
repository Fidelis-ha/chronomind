import { redirect } from 'next/navigation'
import { getSharedChat } from '@/app/actions'
import { ChatList } from '@/components/chat-list'
import { FooterText } from '@/components/footer'
import { formatDate } from '@/lib/utils'

interface SharePageProps {
  params: {
    id: string
  }
}

export async function generateMetadata({
  params
}: SharePageProps) {
  return {
    title: 'Geteilter Chat'
  }
}

export default async function SharePage({ params }: SharePageProps) {
  redirect('/sign-in')
}
