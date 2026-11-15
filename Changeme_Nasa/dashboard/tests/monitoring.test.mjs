import { afterEach, expect, it, vi } from 'vitest'
import * as Sentry from '@sentry/node'

vi.mock('@sentry/node', () => ({ init: vi.fn(), captureException: vi.fn(), flush: vi.fn() }))

async function loadMonitoring(dsn) {
  vi.resetModules()
  vi.stubEnv('SENTRY_DSN', dsn)
  return import('../../server/monitoring.mjs')
}

afterEach(() => {
  vi.unstubAllEnvs()
  vi.clearAllMocks()
})

it('leaves reporting disabled when no DSN is configured', async () => {
  const { reportReadFailure } = await loadMonitoring(undefined)
  await reportReadFailure(new Error('Private database details'), 'series')

  expect(Sentry.init).not.toHaveBeenCalled()
  expect(Sentry.captureException).not.toHaveBeenCalled()
})

it('reports failures with a generic message and scrubbed event metadata', async () => {
  const { reportReadFailure } = await loadMonitoring('https://public@example.invalid/1')
  const original = Object.assign(new Error('Private database details'), { code: 'ECONNRESET' })
  await reportReadFailure(original, 'series')

  const [reported, context] = Sentry.captureException.mock.calls[0]
  expect(reported.message).toBe('Scientific data read failed')
  expect(context.tags).toEqual({ route: 'series', database_error_code: 'ECONNRESET' })
  const { beforeSend } = Sentry.init.mock.calls[0][0]
  expect(beforeSend({ request: {}, breadcrumbs: [], user: {}, tags: context.tags })).toEqual({ tags: context.tags })
  expect(Sentry.flush).toHaveBeenCalledWith(1000)
})
