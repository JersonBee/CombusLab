import { describe, expect, it } from 'vitest'
import { rankStudies, rankTrial, summarizeScenario } from '../src/scientificEvidence'
import { compareConditions, overlayLimitation } from '../src/trialComparison'
import { rankCldFlame } from '../src/cldFlame'

const scenario = { gravity: 'lunar', oxygen: '21', pressure: '10.2', airflow: '', material: '', objective: 'spread' }
const trial = {
  investigation_id: 'PSI-100', experiment_id: 'saffire-a', study_name: 'SAFFIRE-III',
  has_series: true, has_conditions: false, material_original: 'PMMA', material_normalized: 'pmma',
  oxygen_ambient_pct: 21, oxygen_ambient_status: 'measured',
  air_velocity_cm_s: 5, flow_direction: null, length_mm: null, width_mm: null, thickness_mm: null,
}
const bass = {
  ...trial, investigation_id: 'PSI-25', experiment_id: 'bass-a', study_name: 'BASS-II',
  has_series: false, has_conditions: true, oxygen_ambient_pct: null, air_velocity_cm_s: 0,
}

describe('scenario ranking and evidence coverage', () => {
  it('ranks the ACME soot investigation using study context and leaves unavailable conditions unscored', () => {
    const result = rankCldFlame({ ...scenario, gravity: 'microgravity', objective: 'soot' })
    expect(result.criteria.map(criterion => criterion.status)).toEqual(['match', 'match', 'missing', 'missing'])
    expect(result.score).toBe(50)
    expect(rankCldFlame(scenario).matches).toBe(0)
  })

  it('distinguishes mismatched gravity from unavailable pressure and itemizes the score', () => {
    const result = rankTrial(trial, scenario)
    expect(result.criteria.map(({ status }) => status)).toEqual(['match', 'different', 'match', 'missing'])
    expect(result.matches).toBe(2)
    expect(result.score).toBe(50)
  })

  it('ranks reproducibly and prioritizes quantitative evidence in a tied study', () => {
    const catalogOnly = { ...trial, experiment_id: 'a', has_series: false }
    expect(rankStudies([bass, catalogOnly, trial], scenario)).toEqual(rankStudies([trial, bass, catalogOnly], scenario))
    expect(rankStudies([bass, catalogOnly, trial], scenario).map(study => study.best.trial.experiment_id))
      .toEqual(['saffire-a', 'bass-a'])
    expect(rankStudies([trial, bass], scenario).map(study => study.fullMatches)).toEqual([0, 0])
  })

  it('counts catalog gaps separately from documented differences', () => {
    const coverage = summarizeScenario([trial, bass], scenario)
    expect(coverage).toContainEqual({ label: 'Gravity context', match: 0, different: 2, missing: 0 })
    expect(coverage).toContainEqual({ label: 'Total pressure', match: 0, different: 0, missing: 2 })
    expect(coverage).toContainEqual({ label: 'Ambient O₂ (±2 percentage points)', match: 1, different: 0, missing: 1 })
  })
})

describe('trial comparisons', () => {
  it('flags different apparatus and preserves zero airflow as a recorded condition', () => {
    const rows = compareConditions(trial, bass)
    expect(rows.find(row => row.label === 'Test apparatus')?.status).toBe('Different')
    expect(rows.find(row => row.label === 'Airflow (cm/s)')).toMatchObject({ left: 5, right: 0, status: 'Different' })
    expect(rows.find(row => row.label === 'Total pressure')?.status).toBe('Unavailable')
  })

  it('labels approximate oxygen values even when their reported numbers match', () => {
    const rows = compareConditions(trial, { ...trial, oxygen_ambient_status: 'approximate' })
    expect(rows.find(row => row.label === 'Ambient O₂ (%)'))
      .toMatchObject({ left: '21', right: '≈ 21', status: 'Approximate' })
  })

  const series = {
    units: [{ channel: 'o2', unit: '%' }], time_reference: 'first_calibrated_record', time_unit: 's',
    truncated: false, rows: [{ time_s: 0, o2: 0, co2: null }],
  }

  it('allows compatible series with finite readings, including zero', () => {
    expect(overlayLimitation(series, series, 'o2')).toBe('')
  })

  it.each([
    [{ rows: [{ time_s: 0, o2: null, co2: null }] }, /no readings/],
    [{ units: [{ channel: 'o2', unit: 'ppm' }] }, /units/],
    [{ time_reference: 'ignition' }, /time references/],
    [{ truncated: true }, /smaller window/],
  ])('blocks invalid overlays with a specific explanation', (override, reason) => {
    expect(overlayLimitation(series, { ...series, ...override }, 'o2')).toMatch(reason)
  })
})
