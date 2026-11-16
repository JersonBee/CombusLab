import type { Scenario } from '../_shared/scientificEvidence.ts'

export type ChartContext = {
  kind: 'gas' | 'conditions' | 'overlay' | 'ranking' | 'test-days' | 'flame-fronts'
  channel?: 'o2' | 'co2'
  from?: number
  to?: number
}

export type ChatContext = {
  currentPage?: string
  investigationId?: string
  experimentId?: string
  datasetId?: string
  selectedExperiments?: string[]
  activeFilters?: Record<string, string>
  chart?: ChartContext
  scenario?: Scenario
}

export type Citation = {
  id: string
  title: string
  url: string
  experimentId?: string
  investigationId?: string
  datasetId?: string
  href?: string
}

export type EvidenceCard = {
  id: string
  kind: 'Experimental evidence' | 'Measured data' | 'Derived calculation' | 'Comparison' | 'Interpretation' | 'Missing information'
  text: string
  citations: Citation[]
}

export type ChatReply = {
  status: 'ANSWERED' | 'INSUFFICIENT_EVIDENCE' | 'OUT_OF_SCOPE' | 'ERROR'
  answer: string
  citations: Citation[]
  evidence: EvidenceCard[]
  relatedExperiments: string[]
  relatedDatasets: string[]
  subjects: string[]
  provider?: string
}

export const messages = {
  ANSWERED: 'The available evidence supports the following.',
  INSUFFICIENT_EVIDENCE: 'I found insufficient evidence in CombusLab to answer this question confidently.',
  OUT_OF_SCOPE: 'This question is outside my scope. Ask about the combustion research, experiments, datasets, charts or fire-safety evidence in CombusLab.',
  ERROR: 'I could not process your question. Please try again.',
}

export function hasSafeSource(value: unknown): value is string {
  if (typeof value !== 'string') return false
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && ['psi.nasa.gov', 'science.nasa.gov', 'ntrs.nasa.gov', 'www.nasa.gov'].includes(url.hostname) &&
      !url.username && !url.password
  } catch {
    return false
  }
}
