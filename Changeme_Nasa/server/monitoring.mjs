import * as Sentry from '@sentry/node'

const dsn = process.env.SENTRY_DSN
if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT ?? process.env.VERCEL_ENV ?? 'development',
    release: process.env.VERCEL_GIT_COMMIT_SHA,
    defaultIntegrations: false,
    dataCollection: { userInfo: false },
    beforeSend(event) {
      delete event.request
      delete event.breadcrumbs
      delete event.user
      return event
    },
  })
}

export async function reportReadFailure(error, route) {
  if (!dsn) return
  try {
    const code = typeof error?.code === 'string' && /^[A-Z0-9_]{1,32}$/.test(error.code)
      ? error.code : 'UNKNOWN'
    Sentry.captureException(new Error('Scientific data read failed'), {
      tags: { route, database_error_code: code },
    })
    await Sentry.flush(1000)
  } catch {
    console.error('Could not report scientific data read failure')
  }
}
