import { SignUp } from '@clerk/nextjs'
import { AuthShell } from '@/components/layout/AuthShell'
import { AFTER_AUTH_PATH } from '@/lib/after-auth'

export default function SignUpPage() {
  return (
    <AuthShell>
      <SignUp
        fallbackRedirectUrl={AFTER_AUTH_PATH}
        signInFallbackRedirectUrl={AFTER_AUTH_PATH}
      />
    </AuthShell>
  )
}
