import type { Match, Scenario } from './scientificEvidence'

export const cldFlame = {
  id: 'PSI-21',
  name: 'ACME · Coflow Laminar Diffusion Flame (CLD Flame)',
  overview: 'NASA used gaseous flames in the ISS Combustion Integrated Rack to study flame structure and soot formation in microgravity.',
  nasa: 'https://science.nasa.gov/biological-physical/investigations/cld-flame/',
  psi: 'https://psi.nasa.gov/physci/repo/data/investigations/PSI-21',
  path: '/discover?investigation_id=PSI-21',
  endpoint: '/api/catalog?view=test-days&investigation_id=PSI-21',
}

export function rankCldFlame(scenario: Scenario) {
  const criteria: { label: string; status: Match; evidence: string }[] = []
  if (scenario.objective) {
    criteria.push({ label: 'Research objective', status: scenario.objective === 'soot' ? 'match' : 'different',
      evidence: 'NASA describes an objective of validating chemical kinetics and soot formation models.' })
  }
  if (scenario.gravity) {
    criteria.push({ label: 'Gravity context', status: scenario.gravity === 'microgravity' ? 'match' : 'different',
      evidence: 'ISS investigation in microgravity' })
  }
  for (const [value, label] of [
    [scenario.oxygen, 'Ambient O₂'], [scenario.pressure, 'Total pressure'],
    [scenario.airflow, 'Airflow'], [scenario.material.trim(), 'Trial-level material / fuel'],
  ]) {
    if (value) criteria.push({ label, status: 'missing', evidence: 'Unavailable at trial level in the integrated table' })
  }
  const matches = criteria.filter(criterion => criterion.status === 'match').length
  return { criteria, matches, score: criteria.length ? Math.round(100 * matches / criteria.length) : 0 }
}
