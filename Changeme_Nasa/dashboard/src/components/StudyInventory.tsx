import { Link } from 'react-router-dom'
import { useReading } from './ScientificReading'

export type Trial = {
  experiment_id: string
  study_name: string
  material_original: string | null
  has_series: boolean
  has_conditions: boolean
}

export type Catalog = { has_next: boolean; rows: Trial[] }

export type Study = {
  investigation_id: string
  study_name: string
  source_url: string
  source_doi: string
  trials: number
  series_trials: number
  conditions_trials: number
  observations: number
  quantitative_trials: number
}

export function useInventory() {
  return useReading<{ rows: Study[] }>('/api/catalog?view=inventory')
}

export function StudyLink({ study }: { study: Study }) {
  return <Link className="underline" to={'/research?' + new URLSearchParams({ investigation_id: study.investigation_id })}>{study.study_name}</Link>
}
