const maxRows = 5000
export const channelNames = ['o2', 'co2']

export async function readSeries(db, experiment, { id, from, to }) {
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
  return {
    experiment_id: id, from_s: from, to_s: to, units,
    source: { url: experiment.source_url, doi: experiment.source_doi, version: experiment.repository_version },
    time_unit: 's', time_reference: 'first_calibrated_record', truncated: rows.length > maxRows, rows: rows.slice(0, maxRows),
  }
}
