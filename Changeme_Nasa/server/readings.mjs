import { readSnapshot } from './db.mjs'
import { reportReadFailure } from './monitoring.mjs'

const maxRows = 5000
const investigations = ['PSI-98', 'PSI-99', 'PSI-100', 'PSI-26', 'PSI-25']
const pageSize = 20
const channelNames = ['o2', 'co2']

function csvCell(value) {
  if (value == null) return ''
  const text = String(value)
  return '"' + text.replaceAll('"', '""') + '"'
}

function sendExport(response, data, mode, format, id, channel) {
  const file = id.replace(/[^a-zA-Z0-9_-]/g, '-') + '-' + (mode === 'series' ? channel : mode)
  response.setHeader('Content-Disposition', `attachment; filename="${file}.${format}"`)
  if (format === 'json') {
    response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
    return response.end(JSON.stringify(data))
  }
  const source = data.source ?? {
    url: data.experiment.source_url, doi: data.experiment.source_doi, version: data.experiment.repository_version,
  }
  const metadata = {
    experiment_id: id, source_url: source.url, source_doi: source.doi, source_version: source.version,
  }
  const columns = mode === 'series'
    ? [...Object.keys(metadata), 'from_s', 'to_s', 'epoch_ms', 'time_s', 'channel', 'value', 'unit', 'saffire_file_id', 'saffire_source_row']
    : [...Object.keys(metadata), 'investigation_id', 'source_test_id', 'field', 'value', 'lower_bound', 'upper_bound',
        'status', 'qualifier', 'unit', 'method', 'source_record_id', 'source_column']
  const rows = mode === 'series'
    ? data.rows.map(({ [channel]: value, ...row }) => ({
        ...metadata, ...row, from_s: data.from_s, to_s: data.to_s, channel, value, unit: data.units[0]?.unit,
      }))
    : data.conditions.map(({ source_url, ...row }) => ({ ...metadata, ...row, source_url: source_url ?? metadata.source_url }))
  response.writeHead(200, { 'Content-Type': 'text/csv; charset=utf-8' })
  return response.end([columns.join(','), ...rows.map((row) => columns.map((column) => csvCell(row[column])).join(','))].join('\r\n') + '\r\n')
}

async function readCatalog(db, filters) {
  const { rows } = await db.query(
    `SELECT experiment_id, investigation_id, study_name, material_original,
       coalesce(saffire_filas, 0) + coalesce(cygnus_filas, 0) > 0 AS has_series,
       coalesce(condiciones_filas, 0) > 0 AS has_conditions
     FROM combuslab.experiment_catalog
     WHERE investigation_id = ANY($1::text[])
       AND ($2 = '' OR investigation_id = $2)
       AND strpos(lower(concat_ws(' ', study_name, experiment_id, source_test_id,
           material_original, material_normalized)), lower($3)) > 0
       AND ($4::double precision IS NULL OR air_velocity_cm_s >= $4)
       AND ($5::double precision IS NULL OR air_velocity_cm_s <= $5)
     ORDER BY study_name, experiment_id LIMIT $6 OFFSET $7`,
    [investigations, filters.study, filters.query, filters.flowMin, filters.flowMax,
      pageSize + 1, (filters.page - 1) * pageSize],
  )
  return { page: filters.page, has_next: rows.length > pageSize, rows: rows.slice(0, pageSize) }
}

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
      const { rows: [experiment] } = await db.query(
        'SELECT * FROM combuslab.experiment_catalog WHERE experiment_id = $1', [id],
      )
      if (!experiment || !investigations.includes(experiment.investigation_id)) return null
      if (mode === 'experiment' || mode === 'conditions') {
        const { rows: conditions } = await db.query(
          'SELECT * FROM combuslab.experiment_conditions WHERE experiment_id = $1 ORDER BY field, source_column', [id],
        )
        return { experiment, conditions }
      }
      const { rows: units } = await db.query(
        `SELECT channel, unit FROM combuslab.saffire_channel_units
         WHERE investigation_id = $1 AND test = $2 AND channel IN ('o2', 'co2') ORDER BY channel`,
        [experiment.investigation_id, experiment.source_test_id],
      )
      const { rows } = await db.query(
        `SELECT epoch_ms, time_s, o2, co2, saffire_file_id, saffire_source_row
         FROM public.nasa_synchronized WHERE experiment_id = $1 AND time_s BETWEEN $2 AND $3
         ORDER BY epoch_ms LIMIT $4`, [id, from, to, maxRows + 1],
      )
      const data = {
        experiment_id: id, from_s: from, to_s: to, units,
        source: { url: experiment.source_url, doi: experiment.source_doi, version: experiment.repository_version },
        time_unit: 's', time_reference: 'first_calibrated_record', truncated: rows.length > maxRows, rows: rows.slice(0, maxRows),
      }
      if (kind !== 'export') return data
      return {
        ...data, channel, units: units.filter((unit) => unit.channel === channel),
        rows: data.rows.map(({ o2, co2, ...row }) => ({ ...row, [channel]: channel === 'o2' ? o2 : co2 })),
      }
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
