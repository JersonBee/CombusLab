function csvCell(value) {
  if (value == null) return ''
  const text = String(value)
  return '"' + text.replaceAll('"', '""') + '"'
}

export function sendExport(response, data, mode, format, id, channel) {
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

export function selectSeriesChannel(data, channel) {
  return {
    ...data, channel, units: data.units.filter((unit) => unit.channel === channel),
    rows: data.rows.map(({ o2, co2, ...row }) => ({ ...row, [channel]: channel === 'o2' ? o2 : co2 })),
  }
}
