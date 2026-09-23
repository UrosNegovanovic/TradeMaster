import { NextResponse, type NextFetchEvent, type NextRequest } from 'next/server'
import { clerkMiddleware } from '@clerk/nextjs/server'
import { isPublicRoute, shouldProtectHtmlRoute } from '@/lib/route-access'

const withClerk = clerkMiddleware((auth, request) => {
  if (shouldProtectHtmlRoute(request)) {
    auth().protect()
  }
})

export default function middleware(request: NextRequest, event: NextFetchEvent) {
  if (!process.env.CLERK_SECRET_KEY) {
    if (isPublicRoute(request)) {
      return NextResponse.next()
    }
    return NextResponse.redirect(new URL('/', request.url))
  }
  return withClerk(request, event)
}

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest|xml|txt|mp4)).*)',
    '/(api|trpc)(.*)',
  ],
}
