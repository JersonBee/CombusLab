import type { ChartContext, ChatContext } from './chatContract.ts'
import { objectives, type Scenario } from '../_shared/scientificEvidence.ts'

export type ChatRequest = {
  message: string
  context: ChatContext
  conversationHistory: { question: string; subjects: string[] }[]
}

const trial = /^PSI-\d{1,3}:[\w.-]+:r\d+$/
const investigation = /^PSI-\d{1,3}$/
const id = /^(?:PSI-\d{1,3}(?::[\w.-]+:r\d+)?|[a-z][a-z0-9-]{1,59})$/i
const kinds = ['gas', 'conditions', 'overlay', 'ranking', 'test-days', 'flame-fronts']
const filters = ['q', 'material', 'direction', 'sensor', 'coverage', 'objective', 'flow_min', 'flow_max', 'investigation_id']

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function text(value: unknown, size: number) {
  return typeof value === 'string' ? value.trim().slice(0, size) : ''
}

function matching(value: unknown, pattern: RegExp) {
  return typeof value === 'string' && value.length <= 100 && pattern.test(value) ? value : undefined
}

export function parseChatRequest(value: unknown): ChatRequest | undefined {
  const request = record(value)
  if (typeof request.message !== 'string' || !request.message.trim() || request.message.length > 1200) return
  const raw = record(request.context)
  const chart = record(raw.chart)
  const from = chart.from
  const to = chart.to
  const kind = kinds.find(item => item === chart.kind) as ChartContext['kind'] | undefined
  const validWindow = typeof from === 'number' && typeof to === 'number' && Number.isFinite(from) && Number.isFinite(to) &&
    from >= 0 && to >= from && to - from <= 60
  const scenario = record(raw.scenario)
  const rawFilters = record(raw.activeFilters)
  const activeFilters = Object.fromEntries(filters.flatMap(name => {
    const value = text(rawFilters[name], 120)
    return value ? [[name, value]] : []
  }))

  return {
    message: request.message.trim(),
    context: {
      currentPage: text(raw.currentPage, 60),
      experimentId: matching(raw.experimentId, trial),
      investigationId: matching(raw.investigationId, investigation),
      datasetId: matching(raw.datasetId, id),
      selectedExperiments: Array.isArray(raw.selectedExperiments) ? [...new Set(raw.selectedExperiments.slice(0, 2)
        .flatMap(value => matching(value, trial) ?? []))] : [],
      chart: kind ? { kind, channel: chart.channel === 'o2' || chart.channel === 'co2' ? chart.channel : undefined,
        from: validWindow ? from : undefined, to: validWindow ? to : undefined } : undefined,
      scenario: Object.keys(scenario).length ? {
        gravity: text(scenario.gravity, 50), oxygen: text(scenario.oxygen, 20), pressure: text(scenario.pressure, 20),
        airflow: text(scenario.airflow, 20), material: text(scenario.material, 100),
        objective: Object.keys(objectives).find(key => key === scenario.objective) as Scenario['objective'] ?? '',
      } : undefined,
      activeFilters,
    },
    conversationHistory: Array.isArray(request.conversationHistory) ? request.conversationHistory.slice(-4).map(item => {
      const turn = record(item)
      return { question: text(turn.question, 300), subjects: Array.isArray(turn.subjects)
        ? turn.subjects.slice(0, 3).flatMap(value => matching(value, id) ?? []) : [] }
    }) : [],
  }
}
