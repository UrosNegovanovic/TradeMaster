import { SignIn } from '@clerk/nextjs'
import { AuthShell } from '@/components/layout/AuthShell'
import { AFTER_AUTH_PATH } from '@/lib/after-auth'

export default function SignInPage() {
  return (
    <AuthShell>
      <SignIn
        fallbackRedirectUrl={AFTER_AUTH_PATH}
        signUpFallbackRedirectUrl={AFTER_AUTH_PATH}
      />
    </AuthShell>
  )
}
