import { LoginForm } from '@/components/login-form'
import { Separator } from '@/components/ui/separator'

export default async function SignUpPage() {
  return (
    <div className="flex h-[calc(100vh-theme(spacing.16))] flex-col items-center justify-center py-10">
      <div className="w-full max-w-sm">
        <LoginForm action="sign-up" />
        <Separator className="my-4" />
      </div>
    </div>
  )
}
