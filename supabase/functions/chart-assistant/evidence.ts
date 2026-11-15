export const channels = ['o2', 'co2'] as const
export type Channel = typeof channels[number]

type Source = { url: string | null; doi: string | null }
type Series = {
  units: { channel: string; unit: string }[]
  rows: ({ time_s: number } & Record<Channel, number | null>)[]
  source: Source
  time_reference: string
  truncated: boolean
}

export function summarizeChart(series: Series, channel: Channel) {
  const availableChannels = channels.filter(name =>
    series.units.some(unit => unit.channel === name && unit.unit) &&
    series.rows.some(row => Number.isFinite(row[name]) && Number.isFinite(row.time_s)))
  const unit = series.units.find(item => item.channel === channel)?.unit
  if (!unit || !availableChannels.includes(channel) || series.truncated) return null
  const readings = series.rows
    .map(row => ({ time_s: row.time_s, value: row[channel] }))
    .filter((row): row is { time_s: number; value: number } =>
      Number.isFinite(row.value) && Number.isFinite(row.time_s))
  const values = readings.map(row => row.value)
  const first = readings[0]
  const last = readings[readings.length - 1]
  return {
    availableChannels,
    evidence: {
      channel, unit, time_reference: series.time_reference,
      rows: series.rows.length, missing: series.rows.length - values.length, valid: values.length,
      first: first.value, last: last.value, first_time_s: first.time_s, last_time_s: last.time_s,
      delta_percentage_points: unit === '%' && readings.length > 1 ? last.value - first.value : null,
      min: Math.min(...values), max: Math.max(...values),
      mean: values.reduce((total, value) => total + value, 0) / values.length,
    },
  }
}

type Evidence = NonNullable<ReturnType<typeof summarizeChart>>['evidence']

export function chartObservations(evidence: Evidence) {
  const gas = evidence.channel === 'o2' ? 'oxygen' : 'carbon dioxide'
  const direction = evidence.last > evidence.first ? 'higher than' : evidence.last < evidence.first ? 'lower than' : 'equal to'
  return {
    overview: `The chart shows how measured ${gas} concentration varies with elapsed time in this trial. The readings and their units are listed below.`,
    endpoints: evidence.valid > 1
      ? `The last valid reading was ${direction} the first. The values in between may follow a different pattern.`
      : 'This window contains one valid reading. An endpoint comparison requires at least two.',
    gaps: evidence.missing > 0
      ? 'Some rows have no usable reading for this channel. The source does not identify the cause of those gaps.'
      : 'Every row in this window has a usable reading for this channel.',
    limits: 'This chart alone cannot establish what caused a change or predict what will happen in another trial.',
  }
}

export type Observation = keyof ReturnType<typeof chartObservations>

export function readExplanation(text: string, observations: ReturnType<typeof chartObservations>, allowed: readonly Channel[]) {
  const result: unknown = JSON.parse(text.trim())
  if (!result || typeof result !== 'object' || !('observations' in result) ||
      !Array.isArray(result.observations) || result.observations.length < 1 || result.observations.length > 3 ||
      !result.observations.every(id => typeof id === 'string' && Object.hasOwn(observations, id))) {
    throw new Error('Invalid explanation')
  }
  const ids = [...new Set(result.observations as Observation[])]
  const suggested = 'suggested_channel' in result ? result.suggested_channel : null
  const suggestedChannel = allowed.find(channel => channel === suggested)
  return { answer: ids.map(id => observations[id]).join('\n\n'), suggested_channel: suggestedChannel }
}
