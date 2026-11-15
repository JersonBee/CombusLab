import { completions } from './providers.ts'

import { channels, chartObservations, summarizeChart, type Channel } from './evidence.ts'
const json = (body: unknown, status = 200) => Response.json(body, { status })

export async function handle(request: Request) {
  const origin = request.headers.get('Origin')
  const allowedOrigins = (Deno.env.get('COMBUSLAB_ASSISTANT_ORIGINS') ?? '').split(',').map((item) => item.trim())
  if (origin && !allowedOrigins.includes(origin)) return json({ error: 'Origin not allowed' }, 403)
  const response = request.method === 'OPTIONS' ? new Response(null, { status: 204 }) : await explain(request)
  response.headers.set('Cache-Control', 'no-store')
  if (origin) {
    response.headers.set('Access-Control-Allow-Origin', origin)
    response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'authorization, apikey, content-type, x-client-info')
    response.headers.set('Vary', 'Origin')
  }
  return response
}

async function explain(request: Request) {
  if (request.method !== 'POST') return json({ error: 'Use POST' }, 405)
  const token = request.headers.get('Authorization')
  if (!token?.match(/^Bearer [^\s]+$/i)) return json({ error: 'Sign-in required' }, 401)
  const supabase = Deno.env.get('SUPABASE_URL')
  const publishable = Deno.env.get('SUPABASE_ANON_KEY')
  const evidenceOrigin = Deno.env.get('COMBUSLAB_EVIDENCE_ORIGIN')
  if (!supabase || !publishable || !evidenceOrigin) return json({ error: 'Service not configured' }, 503)

  try {
    const user = await fetch(new URL('/auth/v1/user', supabase), {
      headers: { Authorization: token, apikey: publishable }, signal: AbortSignal.timeout(4000),
    })
    if (user.status === 401 || user.status === 403) return json({ error: 'Sign-in required' }, 401)
    if (!user.ok) return json({ error: 'Identity service unavailable' }, 503)
  } catch {
    return json({ error: 'Identity service unavailable' }, 503)
  }

  let chart: Record<string, unknown>
  try {
    // Bound the request before parsing, including requests without Content-Length.
    const reader = request.body?.getReader()
    if (!reader) return json({ error: 'Missing JSON' }, 400)
    let bytes = 0
    let text = ''
    const decoder = new TextDecoder()
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      bytes += value.byteLength
      if (bytes > 8192) {
        await reader.cancel()
        return json({ error: 'Request too large' }, 413)
      }
      text += decoder.decode(value, { stream: true })
    }
    chart = JSON.parse(text + decoder.decode())
    if (!chart || typeof chart !== 'object' || Array.isArray(chart)) throw new Error('Invalid payload')
  } catch {
    return json({ error: 'Invalid JSON' }, 400)
  }
  const { experiment_id, channel, from_s, to_s, question } = chart
  if (typeof experiment_id !== 'string' || !/^PSI-(98|99|100):[\w.-]+:r\d+$/.test(experiment_id) ||
    !channels.includes(channel as Channel) || typeof from_s !== 'number' || typeof to_s !== 'number' ||
    !Number.isFinite(from_s) || !Number.isFinite(to_s) || from_s < 0 || to_s < from_s || to_s - from_s > 60 ||
    typeof question !== 'string' || !question.trim() || question.length > 1200) {
    return json({ error: 'Invalid trial, channel, window or question' }, 400)
  }

  try {
    const url = new URL('/api/series', evidenceOrigin)
    url.search = new URLSearchParams({ experiment_id, from_s: String(from_s), to_s: String(to_s) }).toString()
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) })
    if (response.status === 404) return json({ error: 'Trial not found' }, 404)
    if (!response.ok) return json({ error: 'Evidence service unavailable' }, 502)
    const series = await response.json()
    const summary = summarizeChart(series, channel as Channel)
    if (!summary) {
      return json({ answer: null, reason: 'Insufficient evidence for this window', sources: [series.source] })
    }
    const evidence = { ...summary.evidence, experiment_id, from_s, to_s }
    const observations = chartObservations(evidence)
    const alternates = summary.availableChannels.filter(name => name !== channel)
    const result = await completions(question.trim(), evidence.channel, observations, alternates)
    const fallback = [observations.overview, observations.endpoints, observations.gaps, observations.limits].join('\n\n')
    return json(result
      ? { ...result, evidence, sources: [series.source] }
      : { answer: fallback, fallback: true, evidence, sources: [series.source] })
  } catch {
    return json({ error: 'Chart assistant temporarily unavailable' }, 503)
  }
}

if (import.meta.main) Deno.serve(handle)
