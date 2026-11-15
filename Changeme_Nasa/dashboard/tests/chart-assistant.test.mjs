import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { handle } from '../../../supabase/functions/chart-assistant/index.ts'
import { chartObservations, readExplanation, summarizeChart } from '../../../supabase/functions/chart-assistant/evidence.ts'

const series = {
  units: [{ channel: 'o2', unit: '%' }, { channel: 'co2', unit: '%' }],
  rows: [
    { time_s: 0, o2: null, co2: 0 },
    { time_s: 1, o2: 21, co2: 0.2 },
    { time_s: 2, o2: 20, co2: 0.3 },
  ],
  source: { url: 'https://psi.nasa.gov/physci/repo/data/investigations/PSI-100', doi: '10.60555/040q-4h36' },
  time_reference: 'first_calibrated_record',
  truncated: false,
}
const origin = 'https://combuslab.example'
const fetcher = vi.fn()
const env = {
  COMBUSLAB_ASSISTANT_ORIGINS: origin,
  COMBUSLAB_EVIDENCE_ORIGIN: origin,
  SUPABASE_URL: 'https://supabase.example',
  SUPABASE_ANON_KEY: 'test-public-key',
  GROQ_API_KEY: 'test-groq',
  CLOUDFLARE_ACCOUNT_ID: '00000000000000000000000000000000',
  CLOUDFLARE_API_TOKEN: 'test-cloudflare',
  POLLINATIONS_API_KEY: 'test-pollinations',
}

function ask(body = {}, headers = { Origin: origin, Authorization: 'Bearer session' }) {
  return handle(new Request('https://supabase.example/functions/v1/chart-assistant', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      experiment_id: 'PSI-100:S1:r2', channel: 'o2', from_s: 0, to_s: 5,
      question: 'What does this chart show?', ...body,
    }),
  }))
}

function prepareEvidence(data = series) {
  fetcher.mockResolvedValueOnce(Response.json({ id: 'pilot' }))
    .mockResolvedValueOnce(Response.json(data))
}

beforeEach(() => {
  fetcher.mockReset()
  vi.stubGlobal('Deno', { env: { get: key => env[key] } })
  vi.stubGlobal('fetch', fetcher)
})

afterEach(() => vi.unstubAllGlobals())

it('calculates endpoints from valid readings and preserves zeros', () => {
  expect(summarizeChart(series, 'o2').evidence).toMatchObject({
    valid: 2, missing: 1, first: 21, first_time_s: 1, last: 20, last_time_s: 2,
    mean: 20.5, delta_percentage_points: -1,
  })
  expect(summarizeChart(series, 'co2').evidence.first).toBe(0)
  expect(summarizeChart({ ...series, truncated: true }, 'co2')).toBeNull()
})

it('rejects unsupported observations and ignores suggestions without an available channel', () => {
  const observations = chartObservations(summarizeChart(series, 'o2').evidence)
  expect(() => readExplanation('{"observations":["unverified"]}', observations, ['co2'])).toThrow()
  expect(readExplanation('{"observations":["overview"],"suggested_channel":"co2"}', observations, []))
    .toEqual({ answer: observations.overview, suggested_channel: undefined })
})

it('runs provider failover while grounding the answer in the selected trial and window', async () => {
  prepareEvidence()
  fetcher.mockResolvedValueOnce(new Response(null, { status: 503 }))
    .mockResolvedValueOnce(new Response(null, { status: 429 }))
    .mockResolvedValueOnce(Response.json({ choices: [{ message: { content:
      '{"observations":["overview","endpoints"],"suggested_channel":"co2"}' } }] }))

  const response = await ask()
  const answer = await response.json()
  expect(response.headers.get('access-control-allow-origin')).toBe(origin)
  expect(answer).toMatchObject({ provider: 'pollinations', suggested_channel: 'co2',
    evidence: { experiment_id: 'PSI-100:S1:r2', channel: 'o2', from_s: 0, to_s: 5, unit: '%' },
    sources: [series.source],
  })
  expect(answer.answer).toContain('measured oxygen concentration')
  const url = new URL(fetcher.mock.calls[1][0])
  expect(Object.fromEntries(url.searchParams)).toEqual({ experiment_id: 'PSI-100:S1:r2', from_s: '0', to_s: '5' })
  expect(fetcher.mock.calls.slice(2).map(([url]) => new URL(url).hostname))
    .toEqual(['api.groq.com', 'api.cloudflare.com', 'gen.pollinations.ai'])
})

it('returns a sourced English summary when providers fail or return invalid output', async () => {
  prepareEvidence()
  fetcher.mockRejectedValueOnce(new Error('Provider timed out'))
    .mockResolvedValueOnce(new Response(null, { status: 503 }))
    .mockResolvedValueOnce(Response.json({ choices: [{ message: { content: 'An unverified freeform response' } }] }))
  const response = await ask({ channel: 'co2' })
  const answer = await response.json()
  expect(response.status).toBe(200)
  expect(answer).toMatchObject({ fallback: true, sources: [series.source], evidence: { channel: 'co2' } })
  expect(answer.answer).toContain('measured carbon dioxide concentration')
  expect(answer.answer).not.toContain('unverified')
})

it('reports insufficient evidence before invoking a model', async () => {
  prepareEvidence({ ...series, rows: [] })
  const response = await ask()
  expect(await response.json()).toMatchObject({ answer: null, reason: 'Insufficient evidence for this window' })
  expect(fetcher).toHaveBeenCalledTimes(2)
})

it('retains sign-in and origin restrictions', async () => {
  expect((await ask({}, { Origin: 'https://other.example' })).status).toBe(403)
  expect((await ask({}, { Origin: origin })).status).toBe(401)
  expect(fetcher).not.toHaveBeenCalled()
})

it('rejects an invalid window without fetching data or invoking a model', async () => {
  fetcher.mockResolvedValueOnce(Response.json({ id: 'pilot' }))
  expect((await ask({ to_s: 61 })).status).toBe(400)
  expect(fetcher).toHaveBeenCalledTimes(1)
})
