export const objectives = {
  spread: 'Flame growth and spread',
  ignition: 'Ignition',
  extinction: 'Extinction and suppression',
  materials: 'Material flammability',
  soot: 'Soot formation',
} as const

export type Objective = keyof typeof objectives

type StudyContext = {
  name: string
  objective: string
  topics: readonly Objective[]
  hardware: string
  reference: string
}

const saffireReference = 'https://ntrs.nasa.gov/citations/20170000230'
const saffireHardware = 'SAFFIRE enclosure on an uncrewed Cygnus cargo vehicle'
const bassHardware = 'Small test section in the ISS Microgravity Science Glovebox'

export const researchContext: Record<string, StudyContext> = {
  'PSI-98': {
    name: 'SAFFIRE-I', topics: ['spread', 'materials'], hardware: saffireHardware,
    objective: 'Study the growth of a large fire and examine how material flammability in microgravity relates to ground screening.',
    reference: 'https://psi.nasa.gov/physci/repo/data/investigations/PSI-98',
  },
  'PSI-99': {
    name: 'SAFFIRE-II', topics: ['spread', 'materials'], hardware: saffireHardware,
    objective: 'Examine flame spread on multiple spacecraft-material samples in microgravity.',
    reference: saffireReference,
  },
  'PSI-100': {
    name: 'SAFFIRE-III', topics: ['spread', 'materials'], hardware: saffireHardware,
    objective: 'Study flame growth and spread using a large solid sample in microgravity.',
    reference: saffireReference,
  },
  'PSI-26': {
    name: 'BASS', topics: ['spread', 'extinction', 'materials'], hardware: bassHardware,
    objective: 'Examine the burning and extinction behavior of different solid fuels in microgravity.',
    reference: 'https://www.nasa.gov/wp-content/uploads/2025/07/burning-and-suppression-of-solids-bass.pdf',
  },
  'PSI-25': {
    name: 'BASS-II', topics: ['spread', 'ignition', 'extinction', 'materials'], hardware: bassHardware,
    objective: 'Study ignition, flame growth, spread and extinction of solid fuels in low-velocity forced flow.',
    reference: 'https://psi.nasa.gov/physci/repo/data/investigations/PSI-25',
  },
}

export const sensors = {
  o2: 'O₂ concentration',
  co2: 'CO₂ concentration',
  co: 'CO concentration',
} as const

export type Sensor = keyof typeof sensors

export type Trial = {
  experiment_id: string
  investigation_id: string
  study_name: string
  material_original: string | null
  has_series: boolean
  has_conditions: boolean
}

export type Evidence = Trial & {
  material_normalized: string | null
  source_url: string
  source_doi: string | null
  repository_version: string | number | null
  series_channels: ('o2' | 'co2')[]
  air_velocity_cm_s: number | null
  flow_direction: string | null
  oxygen_ambient_pct: number | null
  oxygen_ambient_status: string | null
  oxygen_ambient_qualifier: string | null
  oxygen_initial_pct: number | null
  oxygen_initial_status: string | null
  has_co: boolean
  ignition_power_w: number | null
  burn_duration_s: number | null
  length_mm: number | null
  width_mm: number | null
  thickness_mm: number | null
}

export const resultTypes = {
  series: 'Synchronized gas series',
  conditions: 'Tabular gas readings',
  catalog: 'Catalog-only evidence',
} as const

export function materialMatches(trial: Evidence, term: string) {
  return [trial.material_original, trial.material_normalized].some(value =>
    value?.toLowerCase().includes(term.trim().toLowerCase()))
}

export function hasSensor(trial: Evidence, sensor: string) {
  return trial.series_channels.some(channel => channel === sensor) ||
    (trial.investigation_id === 'PSI-25' && trial.has_conditions &&
      (sensor === 'o2' || sensor === 'co2' || (sensor === 'co' && trial.has_co)))
}

export function matchesResult(trial: Trial, result: string) {
  if (result === 'series') return trial.has_series
  if (result === 'conditions') return trial.has_conditions
  if (result === 'catalog') return !trial.has_series && !trial.has_conditions
  return true
}

export function trialPath(trial: Pick<Trial, 'experiment_id' | 'investigation_id'>) {
  return '/discover?' + new URLSearchParams({
    investigation_id: trial.investigation_id, experiment_id: trial.experiment_id,
  })
}

export type Scenario = {
  gravity: string
  oxygen: string
  pressure: string
  airflow: string
  material: string
  objective: Objective | ''
}

export type Match = 'match' | 'different' | 'missing'
export const statusLabels = { match: 'Match', different: 'Different', missing: 'Unavailable' }
type Criterion = { label: string; status: Match; evidence: string }

export function rankTrial(trial: Evidence, scenario: Scenario) {
  const context = researchContext[trial.investigation_id]
  const criteria: Criterion[] = []
  function add(label: string, evidence: string | null, matches: boolean) {
    criteria.push({ label, evidence: evidence ?? 'Unavailable in integrated evidence', status: evidence === null ? 'missing' : matches ? 'match' : 'different' })
  }
  if (scenario.objective) {
    add('Research objective', context?.objective ?? null, context?.topics.includes(scenario.objective))
  }
  if (scenario.gravity) {
    add('Gravity context', context ? 'Flight investigation in microgravity' : null, scenario.gravity === 'microgravity')
  }
  if (scenario.oxygen) {
    const value = trial.oxygen_ambient_pct
    const evidence = value === null
      ? null
      : (trial.oxygen_ambient_status === 'approximate' ? 'Approximately ' : '') + value + ' % ambient O₂'
    add('Ambient O₂ (±2 percentage points)', evidence, value !== null && Math.abs(value - Number(scenario.oxygen)) <= 2)
  }
  if (scenario.pressure) add('Total pressure', null, false)
  if (scenario.airflow) {
    const value = trial.air_velocity_cm_s
    add('Airflow (±2 cm/s)', value === null ? null : value + ' cm/s', value !== null && Math.abs(value - Number(scenario.airflow)) <= 2)
  }
  if (scenario.material.trim()) {
    add('Material / fuel', trial.material_original ?? trial.material_normalized, materialMatches(trial, scenario.material))
  }
  const matches = criteria.filter(criterion => criterion.status === 'match').length
  return { trial, criteria, matches, score: criteria.length ? Math.round(matches / criteria.length * 100) : 0 }
}

export function rankStudies(trials: readonly Evidence[], scenario: Scenario) {
  const groups = new Map<string, ReturnType<typeof rankTrial>[]>()
  for (const trial of trials) {
    const results = groups.get(trial.investigation_id) ?? []
    results.push(rankTrial(trial, scenario))
    groups.set(trial.investigation_id, results)
  }
  return [...groups].map(([id, results]) => {
    const quantitative = ({ trial }: ReturnType<typeof rankTrial>) => trial.has_series || trial.has_conditions
    const best = results.sort((a, b) => b.matches - a.matches ||
      Number(quantitative(b)) - Number(quantitative(a)) ||
      a.trial.experiment_id.localeCompare(b.trial.experiment_id, 'en'))[0]
    return { id, best, study: best.trial.study_name, score: best.score,
      matching: results.filter(result => result.matches > 0).length,
      fullMatches: results.filter(result => result.matches > 0 && result.matches === result.criteria.length).length,
      quantitative: results.filter(quantitative).length }
  }).sort((a, b) => b.score - a.score || a.study.localeCompare(b.study, 'en') || a.id.localeCompare(b.id, 'en'))
}

export function summarizeScenario(trials: readonly Evidence[], scenario: Scenario) {
  const criteria = new Map<string, { match: number; different: number; missing: number }>()
  for (const trial of trials) {
    for (const { label, status } of rankTrial(trial, scenario).criteria) {
      const counts = criteria.get(label) ?? { match: 0, different: 0, missing: 0 }
      counts[status]++
      criteria.set(label, counts)
    }
  }
  return [...criteria].map(([label, counts]) => ({ label, ...counts }))
}
