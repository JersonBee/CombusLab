import { scenarios } from '../_shared/scenarios.ts'
import { nasaResearch } from '../_shared/nasaResearch.ts'
import { airflowNote, clockNote, notebookSources, observation } from '../_shared/flightNotebook.ts'
import { hasSensor, matchesResult, materialMatches, rankStudies, researchContext, trialPath, type Evidence, type Objective } from '../_shared/scientificEvidence.ts'
import { compareConditions, overlayLimitation, type ComparisonSeries } from '../_shared/trialComparison.ts'
import { chartObservations, summarizeChart, type Series } from './evidence.ts'
import { hasSafeSource, type Citation, type EvidenceCard } from './chatContract.ts'
import type { ChatRequest } from './chatRequest.ts'

const library = nasaResearch.map(study => ({
  ...study, id: study.title.toLowerCase().split(' and ')[0],
}))
const integratedIds = Object.keys(researchContext)
const fields = [
  ['material_original', 'Material', ''], ['air_velocity_cm_s', 'Airflow', 'cm/s'],
  ['flow_direction', 'Flow direction', ''], ['length_mm', 'Sample length', 'mm'],
  ['width_mm', 'Sample width', 'mm'], ['thickness_mm', 'Sample thickness', 'mm'],
  ['oxygen_ambient_pct', 'Ambient oxygen', '%'], ['oxygen_initial_pct', 'Initial oxygen', '%'],
  ['ignition_power_w', 'Ignition power', 'W'], ['burn_duration_s', 'Burn duration', 's'],
] as const

const normal = (value: string) => value.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')
const chartPattern = /\b(chart|plot|axes|axis|graph|trend|data points|curve|grafica|eje|tendencia|curva)\b/
const datasetPattern = /\b(conjuntos? de datos|dataset|datasets|data sets?|variables?|files?|units?|sensors?|measurements?|data|datos|unidades|sensores|mediciones)\b/
const comparisonPattern = /\b(compare|comparison|comparable|differen\w*|compar\w+|diferenc\w+)\b/
const modelPattern = /\b(modeling|modelling|predict\w*|machine learning|target|features|modelado|predecir|prediccion)\b/
const topicPattern = /\b(fire|combustion|burn\w*|flames?|flammability|flammable|soot|smoke|ignition|extinction|fuels?|flammability|microgravity|ventilation|airflow|o2|co2|oxygen|carbon dioxide|lunar|spacecraft|fuego|llama\w*|hollin|humo|ignicion|extincion|combustible\w*|inflamabilidad|microgravedad|ventilacion|oxigeno|dioxido de carbono)\b/
const unrelatedPattern = /\b(capital (?:of|de)|weather|clima de|stock price|precio de las acciones|football|soccer|futbol|write (?:a poem|code)|ignore (?:previous|all) instructions)\b/
const referentialPattern = /\b(this|these|the other|it|they|its|here|that|them|esta|este|estas|estos|aqui|esa|ese|otra|otro|tiene|tienen|cual fue|el ensayo)\b/
const researchPattern = /\b(where did (?:that|this) come from|de donde sale|study|studies|investigation\w*|experiment\w*|objective|method\w*|research|source\w*|investigacion\w*|objetivo|metod\w*|experimento\w*|fuente\w*)\b/
const unsupportedMetric = /\b(temperature|temperatura|heat flux|flujo termico|humidity|humedad|mass loss|perdida de masa|heat release rate|flame height|altura de llama|flame spread rate|velocidad de propagacion|gravity level|nivel de gravedad|pressure|presion)\b/

type Input = Record<string, string>
type Get = <T>(endpoint: string, params: Input) => Promise<T | null>
type Source = Omit<Citation, 'id'>
type Detail = { conditions: { field: string; unit: string | null; value: number | null; lower_bound: number | null;
  upper_bound: number | null; method: string | null; status: string | null }[] }

export function createEvidenceReader(origin: string): Get {
  return async (endpoint, params) => {
    const url = new URL('/api/' + endpoint, origin)
    url.search = new URLSearchParams(params).toString()
    const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(4500) })
    if (response.status === 404) return null
    if (!response.ok) throw new Error('Evidence unavailable')
    return await response.json()
  }
}

function source(title: string, url: string | null, extra: Partial<Source> = {}): Source[] {
  return hasSafeSource(url) ? [{ ...extra, title, url }] : []
}

function trialSource(trial: Evidence) {
  return source('NASA PSI · ' + trial.study_name, trial.source_url, {
    experimentId: trial.experiment_id, investigationId: trial.investigation_id,
    datasetId: trial.has_series || trial.has_conditions ? trial.experiment_id : undefined, href: trialPath(trial),
  })
}

function explicitSubjects(question: string) {
  const trials: string[] = [...question.matchAll(/\bPSI-\d{1,3}:[\w.-]+:r\d+\b/ig)].map(match =>
    'PSI-' + match[0].slice(4))
  const studies = [...question.matchAll(/\bPSI-\d{1,3}\b/ig)].map(match => match[0].toUpperCase())
  const query = normal(question)
  for (const [id, info] of Object.entries(researchContext)) {
    if (new RegExp('\\b' + info.name.toLowerCase() + '(?![-\\w])').test(query)) studies.push(id)
  }
  if (/\bcld flame\b/.test(query)) studies.push('PSI-21')
  for (const item of library) {
    if (new RegExp('\\b' + item.id + '(?![-\\w])').test(query) ||
        item.links.some(link => {
          const label = link.label.split(' · ')[0].toLowerCase()
          return label.length >= 5 && query.includes(label)
        })) studies.push(item.id)
  }
  return { trials: [...new Set(trials)].slice(0, 2), studies: [...new Set(studies)].slice(0, 5) }
}

function format(value: number) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 5 }).format(value)
}

export async function retrieve(request: ChatRequest, get: Get) {
  const { message, context, conversationHistory } = request
  const query = normal(message)
  const explicit = explicitSubjects(message)
  const referential = referentialPattern.test(query)
  const chartAsked = chartPattern.test(query) || Boolean(context.chart && /\b(what does (this|it) (mean|show)|que (significa|muestra) (esto|esta)|higher|lower|increased|decreased|minimum|maximum|increase|decrease|maximo|maxima|minimo|minima)\b/.test(query))
  const datasetAsked = datasetPattern.test(query)
  const compareAsked = comparisonPattern.test(query)
  const modelAsked = modelPattern.test(query)
  const researchAsked = researchPattern.test(query)
  const previousTurn = [...conversationHistory].reverse().find(turn => turn.subjects.length > 0)
  const historySubjects = previousTurn?.subjects ?? []
  const historyExplicit = explicitSubjects(previousTurn?.question ?? '')
  const pointsToPage = /\b(this|these|here|esta|este|estas|estos|aqui)\b/.test(query)
  const continuation = /^(?:and\b|y\b|what about\b|how about\b|que hay de\b)/.test(query.replace(/^[¿¡]+/, ''))
  const shortDataQuestion = query.split(/\s+/).length <= 6 && datasetAsked
  const followUp = historySubjects.length > 0 && !pointsToPage && !explicit.studies.length && !explicit.trials.length &&
    ((referential && (datasetAsked || researchAsked || chartAsked)) || continuation || shortDataQuestion)
  const cards: EvidenceCard[] = []
  const subjects: string[] = []
  let missing = ''
  const scoped = topicPattern.test(query) || explicit.studies.length || explicit.trials.length || chartAsked || datasetAsked ||
    researchAsked || modelAsked || compareAsked || followUp || unsupportedMetric.test(query) || (referential && (historySubjects.length || context.experimentId || context.investigationId))
  if (unrelatedPattern.test(query) || !scoped) return { status: 'OUT_OF_SCOPE' as const, cards, subjects, missing }

  function add(kind: EvidenceCard['kind'], value: string, sources: Source[]) {
    if (!sources.length || cards.length >= 10) return
    cards.push({
      id: 'E' + (cards.length + 1), kind, text: value,
      citations: sources.map(item => ({ ...item, id: [item.url, item.experimentId, item.datasetId].filter(Boolean).join('|') })),
    })
  }

  const namedStudy = explicit.studies.length > 0
  const trialIds = explicit.trials.length ? explicit.trials
    : namedStudy ? []
    : followUp ? historySubjects.filter(id => id.includes(':')).slice(0, 2)
    : compareAsked || chartAsked && context.chart?.kind === 'overlay' ? context.selectedExperiments?.length ? context.selectedExperiments :
      context.currentPage === '/flight-notebook' ? ['PSI-98:S1:r2', 'PSI-100:S1:r2'] : []
    : [context.experimentId ?? context.datasetId].filter((id): id is string => Boolean(id?.includes(':')))
  const studyIds = explicit.studies.length ? explicit.studies
    : followUp ? historySubjects.filter(id => !id.includes(':')).concat(historyExplicit.studies).slice(0, 5)
    : [context.investigationId, context.datasetId === 'PSI-21' ? 'PSI-21' : undefined]
        .filter((id): id is string => Boolean(id))

  const scenario = /\b(lunar|moon)\b/.test(query) ? scenarios.lunar : /\b(martian|mars|marte)\b/.test(query) ? scenarios.martian : context.scenario
  const rankingAsked = Boolean(scenario && !namedStudy && (chartAsked && context.chart?.kind === 'ranking' || /\b(rank\w*|score\w*|relevan\w*|scenario|escenario|puntuacion|habitat\w*)\b/.test(query)))
  const notebookAsked = !namedStudy && context.currentPage === '/flight-notebook' &&
    !trialIds.length && (chartAsked || referential || topicPattern.test(query))
  const cldAsked = studyIds.includes('PSI-21') || (chartAsked && context.chart?.kind === 'test-days')
  const wantsCatalog = trialIds.length || rankingAsked || (!studyIds.length && (datasetAsked || modelAsked))
  const catalog = wantsCatalog ? (await get<{ rows: Evidence[] }>('catalog', { view: 'evidence' }))?.rows ?? [] : []
  const trials = trialIds.flatMap(id => catalog.find(row => row.experiment_id.toLowerCase() === id.toLowerCase()) ?? [])
  subjects.push(...trials.map(item => item.experiment_id))
  if (trialIds.length && trials.length !== trialIds.length) {
    return { status: 'INSUFFICIENT_EVIDENCE' as const, cards, subjects, missing: 'One or more trials could not be found in the integrated catalog.' }
  }

  if (compareAsked || chartAsked && context.chart?.kind === 'overlay') {
    if (trials.length !== 2) {
      const studies = studyIds.filter(id => integratedIds.includes(id))
      if (studies.length === 2) {
        const [a, b] = studies.map(id => researchContext[id])
        subjects.push(...studies)
        const sources = studies.flatMap(id => source(researchContext[id].name, researchContext[id].reference, { investigationId: id }))
        add('Comparison', a.name + ': ' + a.objective + ' ' + b.name + ': ' + b.objective +
          (a.hardware !== b.hardware ? ' The studies use different apparatus: ' + a.hardware + ' versus ' + b.hardware + '.' :
            ' Both studies use ' + a.hardware + '.') +
          ' Select two trials to check materials, atmosphere, airflow and geometry before comparing outcomes.', sources)
        return { status: cards.length ? 'ANSWERED' as const : 'INSUFFICIENT_EVIDENCE' as const, cards, subjects, missing }
      }
      return { status: 'INSUFFICIENT_EVIDENCE' as const, cards, subjects, missing: 'Select two distinct trials in Compare or supply their IDs. A study name alone does not identify a test or its conditions.' }
    }
    const [a, b] = trials
    const conditions = compareConditions(a, b)
    const different = conditions.filter(row => row.status === 'Different')
    const uncertain = conditions.filter(row => row.status === 'Unavailable' || row.status === 'Approximate')
    const apparatusDiffers = different.some(row => row.label === 'Test apparatus')
    const label = apparatusDiffers ? 'Not directly comparable' : different.length || uncertain.length ? 'Partially comparable' : 'Comparable on the documented fields'
    add('Comparison', label + '. ' + (different.length
      ? 'Documented differences: ' + different.map(row => row.label + ' (' + row.left + ' vs ' + row.right + ')').join('; ') + '. '
      : 'The documented fields agree. ') +
      (uncertain.length ? 'Unavailable or approximate: ' + uncertain.map(row => row.label).join(', ') + '. ' : '') +
      'Check ignition method and sensor placement in the source before comparing quantitative outcomes.',
    [...trialSource(a), ...trialSource(b)])
    if (chartAsked && context.chart?.kind === 'overlay') {
      const series = await fetchSeries([a, b], context.chart, get)
      const channel = context.chart.channel ?? 'o2'
      if (series.every(item => item !== null)) {
        const reason = overlayLimitation(series[0] as ComparisonSeries, series[1] as ComparisonSeries, channel)
        add(reason ? 'Missing information' : 'Comparison',
          reason || 'The overlay uses separately elapsed seconds from the first calibrated sample for each trial. The common axis does not establish a shared ignition time.',
          [...trialSource(a), ...trialSource(b)])
        if (!reason) series.forEach((item, index) => addGas([a, b][index], item!, channel, add))
      }
    }
  } else if (rankingAsked) {
    const study = rankStudies(catalog, scenario!).find(item => item.best.criteria.length)
    if (study) {
      subjects.push(study.best.trial.investigation_id)
      add('Derived calculation', study.study + ' is first in the integrated trial ranking for the selected criteria, at ' +
        study.score + '% relevance. Representative trial ' + study.best.trial.experiment_id + '. ' +
        study.best.criteria.map(item => item.label + ': ' + item.status + ' (' + item.evidence + ')').join('; ') +
        '. The score measures scenario relevance. It does not estimate fire risk.', trialSource(study.best.trial))
    }
  } else if (cldAsked) {
    subjects.push('PSI-21')
    const data = await get<{ rows: { date: string; test_type: string; flames_ignited: number }[]; source: { url: string } }>(
      'catalog', { view: 'test-days', investigation_id: 'PSI-21' })
    if (data?.rows.length) {
      const counts = new Map<string, number>()
      for (const entry of data.rows) counts.set(entry.test_type, (counts.get(entry.test_type) ?? 0) + entry.flames_ignited)
      add('Derived calculation', 'CLD Flame (ACME) records test date, test type and number of flames ignited (count). ' +
        'The integrated table has ' + data.rows.length + ' entries. Totals by type: ' +
        [...counts].map(([type, count]) => type + ' · ' + count).join(', ') +
        '. These counts do not measure flame spread or soot concentration.',
      source('NASA PSI · CLD Flame experimental table', data.source.url, {
        investigationId: 'PSI-21', datasetId: 'PSI-21', href: '/discover?investigation_id=PSI-21',
      }))
    }
  } else if (notebookAsked) {
    subjects.push('PSI-98', 'PSI-100')
    add('Experimental evidence', observation, source(notebookSources[0].label, notebookSources[0].url, { href: '/flight-notebook' }))
    add('Missing information', clockNote + ' ' + airflowNote, [
      ...source(notebookSources[0].label, notebookSources[0].url),
      ...source(notebookSources[1].label, notebookSources[1].url),
    ])
  } else if (trials.length) {
    const active = trials[0]
    const topic = query.match(unsupportedMetric)?.[0]
    if (topic && !modelAsked && !(context.chart?.kind === 'flame-fronts')) {
      missing = 'The integrated record does not provide a verified value for ' + topic + '.'
    } else if (chartAsked && context.chart?.kind === 'conditions') {
      const detail = await get<Detail>('experiment', { experiment_id: active.experiment_id })
      const measured = detail?.conditions.filter(row => row.value !== null && (row.unit === '%' || row.unit === 'ppm')) ?? []
      if (measured.length) add('Measured data', 'The condition charts group reported variables by unit (% or ppm) and plot the recorded condition value. ' +
        measured.slice(0, 10).map(row => row.field + ': ' + row.value + ' ' + row.unit + (row.status ? ' (' + row.status + ')' : '')).join('; ') +
        '. The axis lists condition fields. It does not describe elapsed time.', trialSource(active))
      if (!cards.length) missing = 'No tabular conditions with charted values were found for this trial.'
    } else if (chartAsked && (context.chart?.kind === 'gas' || active.has_series)) {
      const chart = context.chart?.kind === 'gas' && (!followUp || context.experimentId === active.experiment_id) ? context.chart : undefined
      const [series] = await fetchSeries([active], chart, get)
      const channel = chart?.channel ?? active.series_channels[0]
      if (series && channel) addGas(active, series, channel, add)
      if (!cards.length) missing = 'No complete series with a documented unit is available for that channel and time window.'
    } else {
      if (researchAsked || !datasetAsked && !modelAsked) addStudy(active.investigation_id, add)
      if (datasetAsked || modelAsked || !researchAsked) await addDataset(active, add, get)
      if (modelAsked && cards.length) add('Interpretation',
        'Treat the recorded material, geometry and conditions as candidate inputs only when populated. Define a measured outcome, check missingness and evaluate on held-out trials before making predictions. The available trial metadata does not validate a model.',
        trialSource(active))
    }
  } else {
    const searched = studyIds.length ? studyIds : []
    if (searched.length) subjects.push(...searched.slice(0, 3))
    const specificMetric = query.match(unsupportedMetric)?.[0]
    if (specificMetric && !modelAsked && !/\b(what|which|que|cuales) (?:studies|investigaciones|datasets)\b/.test(query)) {
      missing = 'The available records do not establish the requested value for ' + specificMetric + '. Select a measured variable or consult the original source.'
    } else {
      const ids = searched.filter(id => integratedIds.includes(id))
      ids.forEach(id => addStudy(id, add))
      if (datasetAsked && ids.length) {
        const inventory = await get<{ rows: { investigation_id: string; trials: number; series_trials: number; conditions_trials: number; source_url: string }[] }>(
          'catalog', { view: 'inventory' })
        for (const item of inventory?.rows ?? []) {
          if (!ids.includes(item.investigation_id)) continue
          add('Derived calculation', researchContext[item.investigation_id].name + ' has ' + item.trials +
            ' catalog trials, ' + item.series_trials + ' with synchronized series and ' + item.conditions_trials +
            ' with tabular conditions. Open a trial for measured variables and units.',
          source('NASA PSI · ' + researchContext[item.investigation_id].name, item.source_url, {
            investigationId: item.investigation_id, href: '/resources/' + item.investigation_id,
          }))
        }
      }
      const matchedLibrary = library.filter(item => searched.includes(item.id) ||
        item.links.some(link => searched.some(id => link.url.endsWith('/' + id))))
      const selectedLibrary = searched.length ? matchedLibrary.filter(item =>
        !ids.length || searched.includes(item.id) || searched.some(id => !integratedIds.includes(id) && item.links.some(link => link.url.endsWith('/' + id))))
        : library.filter(item => {
          const words = normal(item.topic + ' ' + item.summary).split(/\W+/)
          return query.split(/\W+/).some(word => word.length > 4 && words.includes(word))
        })
      for (const item of selectedLibrary.slice(0, 4)) {
        if (!searched.length) subjects.push(item.id)
        add('Experimental evidence', item.title + '. ' + item.summary + ' ' + item.coverage + '.',
          (item.links.filter(link => !searched.length || searched.includes(item.id) || searched.some(id => link.url.endsWith('/' + id))))
            .map(link => source(link.label, link.url, { href: item.app?.path })[0]).filter(Boolean))
      }
      if (!searched.length && (datasetAsked || modelAsked)) {
        const filters = context.activeFilters ?? {}
        const selected = catalog.filter(row => (row.has_conditions || row.has_series) &&
          (!filters.material || materialMatches(row, filters.material)) &&
          (!filters.investigation_id || row.investigation_id === filters.investigation_id) &&
          (!filters.q || [row.experiment_id, row.study_name, row.material_original].some(value =>
            value?.toLowerCase().includes(filters.q.toLowerCase()))) &&
          (!filters.direction || row.flow_direction === filters.direction) &&
          (!filters.objective || researchContext[row.investigation_id]?.topics.includes(filters.objective as Objective)) &&
          (!filters.sensor || hasSensor(row, filters.sensor)) &&
          (!filters.flow_min || row.air_velocity_cm_s !== null && row.air_velocity_cm_s >= Number(filters.flow_min)) &&
          (!filters.flow_max || row.air_velocity_cm_s !== null && row.air_velocity_cm_s <= Number(filters.flow_max)) &&
          matchesResult(row, filters.coverage ?? ''))
        if (selected.length && modelAsked) {
          const sample = selected.find(trial => trial.series_channels.length > 0) ?? selected[0]
          await addDataset(sample, add, get)
          add('Interpretation', 'These recorded variables are possible model inputs. Choose a measurable outcome, check missing values and validate against held-out trials. A combustion measurement or scenario score alone does not validate a flammability model.', trialSource(sample))
        } else if (selected.length && !selectedLibrary.length) {
          add('Derived calculation', selected.length + ' integrated trials in this selection supply synchronized series or tabular conditions. ' +
            'Select a trial to inspect its variables, units and source.', selected.slice(0, 3).flatMap(trialSource))
        }
      }
    }
  }
  return { status: cards.length ? 'ANSWERED' as const : 'INSUFFICIENT_EVIDENCE' as const, cards,
    subjects: [...new Set(subjects)].slice(0, 3), missing }
}

type Add = (kind: EvidenceCard['kind'], text: string, sources: Source[]) => void

function addStudy(id: string, add: Add) {
  const info = researchContext[id]
  if (info) add('Experimental evidence', info.name + '. ' + info.objective + ' Apparatus: ' + info.hardware + '.',
    source('NASA · ' + info.name, info.reference, { investigationId: id, href: '/resources/' + id }))
}

async function fetchSeries(trials: Evidence[], chart: ChatRequest['context']['chart'], get: Get) {
  return await Promise.all(trials.map(trial => get<Series & ComparisonSeries>('series', {
    experiment_id: trial.experiment_id, from_s: String(chart?.from ?? 0), to_s: String(chart?.to ?? 60),
  })))
}

function addGas(trial: Evidence, series: Series, channel: 'o2' | 'co2', add: Add) {
  const summary = summarizeChart(series, channel)
  if (!summary) return
  const { evidence } = summary
  const notes = chartObservations(evidence)
  const sensor = channel === 'o2' ? 'oxygen (O₂)' : 'carbon dioxide (CO₂)'
  const sources = hasSafeSource(series.source.url)
    ? [{ ...trialSource(trial)[0], title: 'NASA PSI · ' + trial.study_name, url: series.source.url,
        experimentId: trial.experiment_id, datasetId: trial.experiment_id }]
    : trialSource(trial)
  add('Measured data', trial.experiment_id + ' plots elapsed time in seconds from the first calibrated record on X and measured ' +
    sensor + ' (' + evidence.unit + ') on Y. First valid reading: ' + format(evidence.first) + ' ' + evidence.unit + ' at ' +
    format(evidence.first_time_s) + ' s. Last valid: ' + format(evidence.last) + ' ' + evidence.unit + ' at ' +
    format(evidence.last_time_s) + ' s. ' + evidence.valid + ' valid readings and ' + evidence.missing + ' missing in this window.', sources)
  add('Derived calculation', notes.endpoints + ' Observed range: ' + format(evidence.min) + ' to ' + format(evidence.max) +
    ' ' + evidence.unit + '. ' + notes.limits, sources)
}

async function addDataset(trial: Evidence, add: Add, get: Get) {
  const known = fields.flatMap(([key, label, unit]) => {
    const value = trial[key]
    if (value === null || value === undefined) return []
    const qualifier = key === 'oxygen_ambient_pct' ? trial.oxygen_ambient_status : key === 'oxygen_initial_pct' ? trial.oxygen_initial_status : null
    return [label + ' ' + value + (unit ? ' ' + unit : '') + (qualifier ? ' (' + qualifier + ')' : '')]
  })
  const detail = trial.has_conditions ? await get<Detail>('experiment', { experiment_id: trial.experiment_id }) : null
  const variables = [...new Set(detail?.conditions.filter(row =>
    row.value !== null || row.lower_bound !== null || row.upper_bound !== null)
    .map(row => row.field + (row.unit ? ' (' + row.unit + ')' : '') + (row.method ? ' · ' + row.method.replaceAll('_', ' ') : '')) ?? [])]
  const availability = [
    trial.series_channels.length ? 'Recorded series channels: ' + trial.series_channels.map(name =>
      name === 'o2' ? 'oxygen (O₂, %)' : 'carbon dioxide (CO₂, %)').join(', ') + '. The time axis is elapsed seconds.'
      : 'Documented synchronized series channels are unavailable.',
    variables.length ? 'Reported conditions: ' + variables.slice(0, 14).join('; ') + '.' : 'Tabular variable values are unavailable.',
  ].join(' ')
  add('Experimental evidence', trial.experiment_id + ' · ' + trial.study_name + '. ' +
    (known.length ? 'Recorded trial metadata: ' + known.join('; ') + '. ' : 'Sample and setup values are unavailable. ') +
    availability, trialSource(trial))
}
