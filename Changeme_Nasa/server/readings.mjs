import { readSnapshot } from './db.mjs'
import { reportReadFailure } from './monitoring.mjs'
import { investigations, readCatalog } from './modules/catalog.mjs'
import { findExperiment, readConditions } from './modules/experiments.mjs'
import { channelNames, readSeries } from './modules/series.mjs'
import { selectSeriesChannel, sendExport } from './modules/exports.mjs'

export async function handleReading(kind, request, response) {
  const send = (status, data) => {
    response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' })
    response.end(JSON.stringify(data))
  }
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET')
    return send(405, { error: 'Method not allowed' })
  }
  const params = new URL(request.url, 'http://localhost').searchParams
  const id = params.get('experiment_id')
  const mode = kind === 'export' ? params.get('mode') : kind
  const format = params.get('format')
  const channel = params.get('channel')
  if (kind === 'export' && (!['conditions', 'series'].includes(mode) || !['csv', 'json'].includes(format) ||
    (mode === 'series' && !channelNames.includes(channel)))) {
    return send(400, { error: 'Valid mode, format and series channel required' })
  }
  if (kind !== 'catalog' && (!id || id.length > 160)) return send(400, { error: 'Valid experiment_id required' })
  const study = params.get('investigation_id') ?? ''
  const query = (params.get('q') ?? '').trim()
  const page = Number(params.get('page') ?? '1')
  const flowMin = params.get('flow_min')?.trim() ? Number(params.get('flow_min')) : null
  const flowMax = params.get('flow_max')?.trim() ? Number(params.get('flow_max')) : null
  if (kind === 'catalog' && (query.length > 120 || (study && !investigations.includes(study)) ||
    !Number.isInteger(page) || page < 1 || page > 100 ||
    [flowMin, flowMax].some((value) => value !== null && (!Number.isFinite(value) || value < 0)) ||
    (flowMin !== null && flowMax !== null && flowMin > flowMax))) {
    return send(400, { error: 'Invalid catalog filters' })
  }
  const from = Number(params.get('from_s') ?? '0')
  const to = Number(params.get('to_s') ?? '60')
  if (mode === 'series' && (!Number.isFinite(from) || !Number.isFinite(to) || from < 0 || to < from || to - from > 60)) {
    return send(400, { error: 'Use a nonnegative time window of at most 60 seconds' })
  }
  try {
    const result = await readSnapshot(async (db) => {
      if (kind === 'catalog') return readCatalog(db, { study, query, page, flowMin, flowMax })
      const experiment = await findExperiment(db, id)
      if (!experiment) return null
      if (mode === 'experiment' || mode === 'conditions') return readConditions(db, experiment, id)
      const data = await readSeries(db, experiment, { id, from, to })
      return kind === 'export' ? selectSeriesChannel(data, channel) : data
    })
    if (!result) return send(404, { error: 'Experiment not found' })
    if (kind !== 'export') return send(200, result)
    if (result.truncated) return send(422, { error: 'Select a smaller time window for a complete export' })
    return sendExport(response, result, mode, format, id, channel)
  } catch (error) {
    console.error('CombusLab read failed', error?.code ?? error?.name)
    await reportReadFailure(error, kind)
    return send(503, { error: 'Scientific data temporarily unavailable' })
  }
}
