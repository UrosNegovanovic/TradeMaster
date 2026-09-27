'use client'

import { useState } from 'react'
import { useClerk } from '@clerk/nextjs'
import { LogOut } from 'lucide-react'
import { sr } from '@/lib/ui-copy'
import { cn } from '@/lib/utils'

type SignOutControlProps = {
  className?: string
  onBeforeSignOut?: () => void
}

function SignOutButtonUi({
  className,
  pending,
  onClick,
}: {
  className?: string
  pending: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className={cn(
        'flex w-full min-h-12 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors',
        'hover:bg-accent hover:text-accent-foreground',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        'disabled:pointer-events-none disabled:opacity-50',
        className
      )}
    >
      <LogOut className="h-5 w-5 shrink-0" />
      {pending ? sr.common.signingOut : sr.common.signOut}
    </button>
  )
}

function ClerkSignOutControl({ className, onBeforeSignOut }: SignOutControlProps) {
  const { signOut } = useClerk()
  const [pending, setPending] = useState(false)

  async function handleSignOut() {
    if (pending) return
    onBeforeSignOut?.()
    setPending(true)
    try {
      await signOut({ redirectUrl: '/sign-in' })
    } catch {
      setPending(false)
    }
  }

  return <SignOutButtonUi className={className} pending={pending} onClick={handleSignOut} />
}

export function SignOutControl(props: SignOutControlProps) {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return <SignOutButtonUi className={props.className} pending={false} onClick={() => props.onBeforeSignOut?.()} />
  }

  return <ClerkSignOutControl {...props} />
}
