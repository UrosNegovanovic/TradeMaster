import Link from 'next/link'
import { ArrowRight, CheckCircle2, Circle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { OnboardingProgress } from '@/lib/onboarding'

export function OnboardingChecklist({ progress }: { progress: OnboardingProgress }) {
  if (progress.complete) return null

  return (
    <Card className="min-w-0 border-primary/40">
      <CardHeader className="p-4 pb-2 sm:p-5 sm:pb-2">
        <CardTitle className="text-lg">Prvi koraci</CardTitle>
        <CardDescription>
          Završeno {progress.doneCount} od {progress.total}. Lista nestaje kada sve bude spremno.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 pt-0 sm:p-5 sm:pt-0">
        <ol className="space-y-2">
          {progress.steps.map((step) => {
            const isNext = progress.next?.id === step.id
            return (
              <li
                key={step.id}
                className="flex min-h-11 flex-col gap-2 rounded-md border px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-start gap-3">
                  {step.done ? (
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600" aria-hidden />
                  ) : (
                    <Circle className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
                  )}
                  <div className="min-w-0">
                    <p className={step.done ? 'font-medium text-muted-foreground line-through' : 'font-medium'}>
                      {step.title}
                      <span className="sr-only">{step.done ? ' (završeno)' : ' (nije završeno)'}</span>
                    </p>
                    {!step.done ? (
                      <p className="text-sm text-muted-foreground">{step.description}</p>
                    ) : null}
                  </div>
                </div>
                {!step.done ? (
                  <Button asChild size="sm" variant={isNext ? 'default' : 'outline'} className="w-full shrink-0 sm:w-auto">
                    <Link href={step.href}>
                      {step.actionLabel}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                ) : null}
              </li>
            )
          })}
        </ol>
      </CardContent>
    </Card>
  )
}
