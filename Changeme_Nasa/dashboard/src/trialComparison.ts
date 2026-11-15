import { researchContext } from './scientificEvidence'

export type ComparisonConditions = {
  investigation_id: string
  material_original: string | null
  material_normalized: string | null
  air_velocity_cm_s: number | null
  flow_direction: string | null
  length_mm: number | null
  width_mm: number | null
  thickness_mm: number | null
  oxygen_ambient_pct: number | null
  oxygen_ambient_status: string | null
}

export type Channel = 'o2' | 'co2'
export type ComparisonSeries = {
  units: { channel: string; unit: string }[]
  time_reference: string
  time_unit: string
  truncated: boolean
  rows: { time_s: number; o2: number | null; co2: number | null }[]
}

function textKey(value: string | number | null) {
  return typeof value === 'string' ? value.trim().toLowerCase() || null : value
}

export function compareConditions(a: ComparisonConditions, b: ComparisonConditions) {
  const context = (trial: ComparisonConditions) => researchContext[trial.investigation_id]
  const fields = [
    { label: 'Gravity context', value: (trial: ComparisonConditions) => context(trial) ? 'Microgravity investigation' : null },
    { label: 'Test apparatus', value: (trial: ComparisonConditions) => context(trial)?.hardware ?? null },
    { label: 'Material / fuel', value: (trial: ComparisonConditions) => trial.material_original || trial.material_normalized,
      key: (trial: ComparisonConditions) => trial.material_normalized || trial.material_original },
    { label: 'Ambient O₂ (%)', value: (trial: ComparisonConditions) => trial.oxygen_ambient_pct,
      display: (trial: ComparisonConditions) => trial.oxygen_ambient_pct === null ? null :
        (trial.oxygen_ambient_status === 'approximate' ? '≈ ' : '') + trial.oxygen_ambient_pct,
      uncertain: (trial: ComparisonConditions) => trial.oxygen_ambient_status === 'approximate' },
    { label: 'Total pressure', value: () => null },
    { label: 'Airflow (cm/s)', value: (trial: ComparisonConditions) => trial.air_velocity_cm_s },
    { label: 'Flow direction', value: (trial: ComparisonConditions) => trial.flow_direction },
    { label: 'Length (mm)', value: (trial: ComparisonConditions) => trial.length_mm },
    { label: 'Width (mm)', value: (trial: ComparisonConditions) => trial.width_mm },
    { label: 'Thickness (mm)', value: (trial: ComparisonConditions) => trial.thickness_mm },
  ]
  return fields.map(({ label, value, key = value, display = value, uncertain }) => {
    const left = textKey(key(a))
    const right = textKey(key(b))
    const status = left === null || right === null ? 'Unavailable' :
      uncertain?.(a) || uncertain?.(b) ? 'Approximate' : left === right ? 'Match' : 'Different'
    return { label, left: display(a), right: display(b), status }
  })
}

export function hasChannelReadings(series: ComparisonSeries, channel: Channel) {
  return series.rows.some(row => Number.isFinite(row[channel]))
}

export function channelUnit(series: ComparisonSeries, channel: Channel) {
  return series.units.find(item => item.channel === channel)?.unit
}

export function overlayLimitation(a: ComparisonSeries, b: ComparisonSeries, channel: Channel) {
  if (!hasChannelReadings(a, channel) || !hasChannelReadings(b, channel)) {
    return 'The selected channel has no readings for one or both trials in this window.'
  }
  const unit = channelUnit(a, channel)
  if (!unit || unit !== channelUnit(b, channel)) return 'The units are missing or differ for this channel.'
  if (a.time_reference !== 'first_calibrated_record' || b.time_reference !== a.time_reference ||
      a.time_unit !== 's' || b.time_unit !== 's') return 'The time references are incompatible.'
  if (a.truncated || b.truncated) return 'Choose a smaller window to compare both series completely.'
  return ''
}
