import { afterEach, describe, expect, it, vi } from 'vitest'
import { answerChat, validateSelection } from '../../../supabase/functions/chart-assistant/chat'
import { parseChatRequest } from '../../../supabase/functions/chart-assistant/chatRequest'
import { handle } from '../../../supabase/functions/chart-assistant/index'

const a = 'PSI-98:S1:r2'
const b = 'PSI-25:test:r1'
const sourceUrl = id => 'https://psi.nasa.gov/physci/repo/data/investigations/' + id

const baseTrial = {
  experiment_id: a, investigation_id: 'PSI-98', study_name: 'SAFFIRE-I', material_original: 'SIBAL',
  material_normalized: 'sibal', source_url: sourceUrl('PSI-98'), air_velocity_cm_s: 20, flow_direction: 'concurrent',
  oxygen_ambient_pct: 21, oxygen_ambient_status: null, length_mm: 940, width_mm: 406, thickness_mm: null,
  series_channels: ['o2', 'co2'], has_series: true, has_conditions: false,
}
const otherTrial = { ...baseTrial, experiment_id: b, investigation_id: 'PSI-25', study_name: 'BASS-II',
  material_original: 'PMMA', material_normalized: 'pmma', air_velocity_cm_s: 5, source_url: sourceUrl('PSI-25'),
  series_channels: [], has_series: false, has_conditions: true }
const series = {
  rows: [{ time_s: 12, o2: 20, co2: .2 }, { time_s: 13, o2: 19, co2: .3 }, { time_s: 14, o2: null, co2: .4 }],
  units: [{ channel: 'o2', unit: '%' }, { channel: 'co2', unit: '%' }],
  source: { url: sourceUrl('PSI-98'), doi: null }, time_reference: 'first_calibrated_record', time_unit: 's', truncated: false,
}

function reader(endpoint, parameters) {
  if (endpoint === 'catalog' && parameters.view === 'evidence') return Promise.resolve({ rows: [baseTrial, otherTrial] })
  if (endpoint === 'catalog' && parameters.view === 'inventory') return Promise.resolve({ rows: [{
    investigation_id: 'PSI-98', trials: 2, series_trials: 1, conditions_trials: 0, source_url: sourceUrl('PSI-98'),
  }] })
  if (endpoint === 'experiment') return Promise.resolve({ conditions: [
    { field: 'initial_co_ppm', unit: 'ppm', value: 3, method: 'gas_analyzer', status: 'reported' },
    { field: 'pressure', unit: 'psi', value: null, lower_bound: null, upper_bound: null },
  ] })
  if (endpoint === 'series') return Promise.resolve(series)
  return Promise.resolve(null)
}

function chat(message, context = {}, history = [], get = reader, select = async () => null) {
  return answerChat(parseChatRequest({ message, context, conversationHistory: history }), get, select)
}

afterEach(() => vi.unstubAllGlobals())

describe('scientific assistant', () => {
  it('uses the current investigation and links the published objective', async () => {
    const answer = await chat('What is the objective of this investigation?', { investigationId: 'PSI-98' })
    expect(answer.status).toBe('ANSWERED')
    expect(answer.evidence[0].text).toContain('ground screening')
    expect(answer.citations[0].url).toBe(sourceUrl('PSI-98'))
  })

  it('retrieves only recorded variables and documents units and methods', async () => {
    const answer = await chat('What variables does this dataset contain?', { datasetId: b, currentPage: '/data-lab' })
    expect(answer.status).toBe('ANSWERED')
    expect(answer.relatedDatasets).toEqual([b])
    expect(answer.evidence[0].text).toContain('initial_co_ppm (ppm) · gas analyzer')
    expect(answer.evidence[0].text).not.toContain('pressure')
  })

  it('uses the displayed time window and channel when interpreting a chart', async () => {
    const get = vi.fn(reader)
    const answer = await chat('What trend do you see on this chart?', {
      experimentId: a, chart: { kind: 'gas', from: 12, to: 14, channel: 'co2' },
    }, [], get)
    expect(get).toHaveBeenCalledWith('series', { experiment_id: a, from_s: '12', to_s: '14' })
    expect(answer.evidence[0].text).toContain('carbon dioxide (CO₂)')
    expect(answer.evidence[0].text).toContain('elapsed time in seconds')
    expect(answer.evidence[1].text).toContain('cannot establish what caused a change')
  })

  it('uses the previous subject for a follow-up and preserves source metadata', async () => {
    const first = await chat('What does SAFFIRE-I study?')
    const second = await chat('What datasets does it have?', {}, [{ question: 'What does SAFFIRE-I study?', subjects: first.subjects }])
    expect(second.status).toBe('ANSWERED')
    expect(second.evidence.some(card => card.text.includes('1 with synchronized series'))).toBe(true)
    const sofie = await chat('What does SoFIE study?')
    const followUp = await chat('What datasets does it have?', {}, [{ question: 'What does SoFIE study?', subjects: sofie.subjects }])
    expect(followUp.citations.some(citation => citation.url.includes('sofie-gel'))).toBe(true)
  })

  it.each(['What was the maximum temperature of this experiment?', '¿Cuál fue la temperatura máxima del experimento?'])(
    'returns insufficient evidence when the requested variable is unavailable (%s)', async message => {
      const answer = await chat(message, { experimentId: a })
      expect(answer.status).toBe('INSUFFICIENT_EVIDENCE')
      expect(answer.evidence).toEqual([])
    },
  )

  it.each(['What is the capital of Japan?', '¿Cuál es la capital de Francia?', 'Tell me a joke'])(
    'rejects unrelated questions before retrieval (%s)', async message => {
      const get = vi.fn(reader)
      const answer = await chat(message, { experimentId: a }, [], get)
      expect(answer.status).toBe('OUT_OF_SCOPE')
      expect(get).not.toHaveBeenCalled()
    },
  )

  it('distinguishes technical failures from missing variables', async () => {
    const unavailable = async () => { throw new Error('private connection error') }
    const answer = await chat('Explain this chart', { experimentId: a }, [], unavailable)
    expect(answer.status).toBe('ERROR')
    expect(answer.answer).not.toContain('private')
  })

  it('explains methodological differences with both trial sources', async () => {
    const answer = await chat('Can I directly compare these two experiments?', { selectedExperiments: [a, b] })
    expect(answer.status).toBe('ANSWERED')
    expect(answer.evidence[0].text).toContain('Not directly comparable')
    expect(answer.evidence[0].text).toContain('Test apparatus')
    expect(answer.relatedExperiments).toEqual([a, b])
  })

  it('rejects evidence identifiers invented by a model and keeps the deterministic fallback', async () => {
    const select = async (_input, cards) => ({ provider: 'test', ids: validateSelection('{"evidenceIds":["made-up"]}', cards) })
    const answer = await chat('Explain this chart', { experimentId: a }, [], reader, select)
    expect(answer.status).toBe('ANSWERED')
    expect(answer.provider).toBeUndefined()
    expect(answer.citations.every(citation => citation.url === sourceUrl('PSI-98'))).toBe(true)
  })

  it('drops unsafe source metadata rather than inventing a citation', async () => {
    const get = async endpoint => endpoint === 'catalog'
      ? { rows: [{ ...baseTrial, source_url: 'https://nasa.gov.invalid/fake' }] } : null
    const answer = await chat('Which variables are recorded in this dataset?', { datasetId: a }, [], get)
    expect(answer.status).toBe('INSUFFICIENT_EVIDENCE')
    expect(answer.citations).toEqual([])
  })

  it('bounds the history, accepts only known filters and discards invalid chart windows', () => {
    const input = parseChatRequest({
      message: 'Explain this chart',
      context: { chart: { kind: 'gas', channel: 'co2', from: 0, to: 61 }, activeFilters: { q: 'sibal', unknown: 'drop' } },
      conversationHistory: Array.from({ length: 9 }, () => ({ question: 'X'.repeat(600), subjects: [a] })),
    })
    expect(input.context.chart.from).toBeUndefined()
    expect(input.context.activeFilters).toEqual({ q: 'sibal' })
    expect(input.conversationHistory).toHaveLength(4)
    expect(input.conversationHistory[0].question).toHaveLength(300)
  })
})

describe('public Edge endpoint', () => {
  it('supports the structured chat and existing inline chart endpoint', async () => {
    vi.stubGlobal('Deno', { env: { get: name => name === 'COMBUSLAB_EVIDENCE_ORIGIN' ? 'https://example.com' : undefined } })
    vi.stubGlobal('fetch', vi.fn(async url => {
      const path = new URL(url)
      return Response.json(await reader(path.pathname.split('/').at(-1), Object.fromEntries(path.searchParams)))
    }))
    const payload = body => new Request('https://example.com/functions/v1/chart-assistant', {
      method: 'POST', body: JSON.stringify(body),
    })
    const chatReply = await handle(payload({ mode: 'chat', message: 'Explain this chart', context: { experimentId: a } }))
    expect((await chatReply.json()).status).toBe('ANSWERED')
    const legacy = await handle(payload({ experiment_id: a, channel: 'o2', from_s: 12, to_s: 14, question: 'What does this chart show?' }))
    expect((await legacy.json()).evidence.valid).toBe(2)
  })
})


it('asks the existing Groq adapter for evidence IDs and rejects provider-authored sources', async () => {
  const env = {
    COMBUSLAB_EVIDENCE_ORIGIN: 'https://evidence.example',
    SUPABASE_URL: 'https://supabase.example',
    SUPABASE_SERVICE_ROLE_KEY: 'test-quota-key',
    GROQ_API_KEY: 'test-provider-key',
  }
  vi.stubGlobal('Deno', { env: { get: name => env[name] } })
  const fetcher = vi.fn(async (target, options) => {
    const url = new URL(target)
    if (url.hostname === 'evidence.example') {
      return Response.json(await reader(url.pathname.split('/').at(-1), Object.fromEntries(url.searchParams)))
    }
    if (url.pathname.endsWith('/read_assistant_catalog_cache')) return Response.json(null)
    if (url.pathname.endsWith('/write_assistant_catalog_cache')) return new Response(null, { status: 204 })
    if (url.hostname === 'supabase.example') return Response.json(true)
    expect(url.hostname).toBe('api.groq.com')
    expect(options.headers.Authorization).toBe('Bearer test-provider-key')
    const { messages, response_format } = JSON.parse(options.body)
    expect(response_format.type).toBe('json_object')
    const retrieved = JSON.parse(messages[1].content)
    expect(retrieved.evidence.map(card => card.id)).toEqual(['E1', 'E2'])
    expect(retrieved.evidence.every(card => !('rows' in card))).toBe(true)
    return Response.json({ choices: [{ message: { content: JSON.stringify({
      evidenceIds: ['E2', 'E1'], citations: ['https://made-up.example'],
    }) } }] })
  })
  vi.stubGlobal('fetch', fetcher)
  const response = await handle(new Request('https://supabase.example/functions/v1/chart-assistant', {
    method: 'POST', body: JSON.stringify({ mode: 'chat', message: 'What does this chart show?', context: { experimentId: a } }),
  }))
  const reply = await response.json()
  expect(reply.provider).toBe('groq')
  expect(reply.evidence.map(card => card.id)).toEqual(['E2', 'E1'])
  expect(reply.citations.map(item => item.url)).toEqual([sourceUrl('PSI-98')])
  expect(JSON.stringify(reply)).not.toContain('test-provider-key')
})

it('keeps the public chat available when the configured Edge Function rejects the new mode', async () => {
  const { Readable } = await import('node:stream')
  const { handleAssistant } = await import('../../server/assistant.mjs')
  vi.stubEnv('SUPABASE_URL', 'https://supabase.example')
  vi.stubGlobal('fetch', vi.fn(async () => Response.json({ error: 'Invalid trial' }, { status: 400 })))
  try {
    const message = { message: 'What studies does SoFIE run?', context: { currentPage: '/resources' } }
    const req = Object.assign(Readable.from([Buffer.from(JSON.stringify(message))]), { method: 'POST' })
    const res = { writeHead: vi.fn(), end: vi.fn() }
    await handleAssistant(req, res)
    expect(res.writeHead).toHaveBeenCalledWith(200, expect.any(Object))
    const reply = JSON.parse(res.end.mock.calls[0][0])
    expect(reply.status).toBe('ANSWERED')
    expect(reply.citations.some(citation => citation.url.includes('/sofie-gel/'))).toBe(true)
  } finally {
    vi.unstubAllEnvs()
  }
})

it('resolves short follow-ups against the last supported subject and respects an explicit page reference', async () => {
  const history = [
    { question: 'What does SAFFIRE-I study?', subjects: ['PSI-98'] },
    { question: 'An unrelated question', subjects: [] },
  ]
  const followUp = await chat('Which datasets?', { investigationId: 'PSI-25' }, history)
  expect(followUp.subjects).toContain('PSI-98')
  expect(followUp.evidence.some(card => card.text.includes('with synchronized series'))).toBe(true)
  const currentPage = await chat('What datasets does this investigation have?', { investigationId: 'PSI-25' }, history)
  expect(currentPage.subjects).toEqual(['PSI-25'])
})

it('caches only shared catalog evidence and falls back to the source on cache errors', async () => {
  const { withCatalogCache } = await import('../../../supabase/functions/chart-assistant/catalogCache')
  vi.stubGlobal('Deno', { env: { get: name => ({ SUPABASE_URL: 'https://supabase.example', SUPABASE_SERVICE_ROLE_KEY: 'test' })[name] } })
  const values = new Map()
  const rpc = vi.fn(async (url, options) => {
    const { cache_key, payload } = JSON.parse(options.body)
    if (String(url).endsWith('/read_assistant_catalog_cache')) return Response.json(values.get(cache_key) ?? null)
    values.set(cache_key, payload)
    return new Response(null, { status: 204 })
  })
  vi.stubGlobal('fetch', rpc)
  const read = vi.fn(reader)
  const cached = withCatalogCache(read)
  expect(await cached('catalog', { view: 'evidence' })).toEqual(await reader('catalog', { view: 'evidence' }))
  expect(await cached('catalog', { view: 'evidence' })).toEqual(await reader('catalog', { view: 'evidence' }))
  expect(read).toHaveBeenCalledTimes(1)
  const calls = rpc.mock.calls.length
  await cached('series', { experiment_id: a, from_s: '0', to_s: '60' })
  expect(rpc).toHaveBeenCalledTimes(calls)
  rpc.mockRejectedValue(new Error('Unavailable'))
  expect(await cached('catalog', { view: 'inventory' })).toEqual(await reader('catalog', { view: 'inventory' }))
})
