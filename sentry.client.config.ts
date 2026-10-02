import * as Sentry from '@sentry/nextjs'
import { sentryBaseOptions } from '@/lib/sentry-options'

// Only bundled when NEXT_PUBLIC_SENTRY_DSN is set (see next.config.js).
Sentry.init({
  ...sentryBaseOptions(),
  // RouteError logs render errors with console.error; report those as well.
  integrations: [Sentry.captureConsoleIntegration({ levels: ['error'] })],
})
