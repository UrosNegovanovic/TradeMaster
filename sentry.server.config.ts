import * as Sentry from '@sentry/nextjs'
import { sentryBaseOptions } from '@/lib/sentry-options'

// API routes catch their own errors and log them with console.error, so report those.
Sentry.init({
  ...sentryBaseOptions(),
  integrations: [Sentry.captureConsoleIntegration({ levels: ['error'] })],
})
