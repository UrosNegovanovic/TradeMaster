import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { sr } from '@/lib/ui-copy'

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardContent className="py-10 text-center">
          <h1 className="mb-2 text-xl font-bold">{sr.route.notFoundTitle}</h1>
          <p className="mb-6 text-muted-foreground">{sr.route.notFoundDescription}</p>
          <Button className="min-h-11" asChild>
            <Link href="/">{sr.common.home}</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
