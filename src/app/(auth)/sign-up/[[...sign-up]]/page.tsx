import Link from 'next/link'
import { SignUp } from '@clerk/nextjs'
import { AuthShell } from '@/components/layout/AuthShell'
import { AFTER_AUTH_PATH } from '@/lib/after-auth'

export default function SignUpPage() {
  return (
    <AuthShell>
      <div className="flex flex-col items-center gap-3">
        <SignUp
          fallbackRedirectUrl={AFTER_AUTH_PATH}
          signInFallbackRedirectUrl={AFTER_AUTH_PATH}
        />
        <p className="max-w-[25rem] text-center text-xs leading-relaxed text-muted-foreground">
          Registracijom prihvatate{' '}
          <Link href="/uslovi" className="underline">
            Uslove korišćenja
          </Link>{' '}
          (uključujući ugovor o obradi podataka) i{' '}
          <Link href="/privatnost" className="underline">
            Obaveštenje o privatnosti
          </Link>
          .
        </p>
      </div>
    </AuthShell>
  )
}
