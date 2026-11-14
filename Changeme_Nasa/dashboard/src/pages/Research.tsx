import { useState } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import { Line } from 'react-chartjs-2'
import type { ChartOptions } from 'chart.js'
import { DynamicBarChart } from '../components/Charts'
import { useReading, RequestStatus } from '../components/ScientificReading'
import { ChartAssistant } from '../components/ChartAssistant'
import { useEvidence } from '../components/StudyInventory'
import { DownloadLinks, EvidenceLinks } from '../components/EvidenceLinks'
import { hasSensor, materialMatches, matchesResult, objectives, researchContext, resultTypes, sensors, type Objective } from '../scientificEvidence'

const channels = [
  { name: 'o2', label: 'O₂', color: '#B7E4F9' },
  { name: 'co2', label: 'CO₂', color: '#FEB352' },
] as const

type Condition = {
  field: string
  value: number | null
  lower_bound: number | null
  upper_bound: number | null
  unit: string | null
  status: string | null
  qualifier: string | null
  source_column: string | null
  source_url: string | null
  method: string | null
}
type Detail = {
  experiment: {
    investigation_id: string; study_name: string; material_original: string | null; source_url: string | null
    source_doi: string | null; repository_version: string | null
    thickness_mm: number | null; length_mm: number | null; width_mm: number | null
    air_velocity_cm_s: number | null
    source_test_id: string | null; source_sample_id: string | null; test_date: string | null
    saffire_filas: number | string | null; cygnus_filas: number | string | null
  }
  conditions: Condition[]
}
type Series = {
  rows: { epoch_ms: string; time_s: number; o2: number | null; co2: number | null }[]
  units: { channel: string; unit: string }[]
  source: { url: string | null }
  truncated: boolean
}

const chartOptions: ChartOptions<'line'> = {
  responsive: true,
  maintainAspectRatio: false,
  parsing: false,
  scales: {
    x: { type: 'linear', title: { display: true, text: 'Elapsed time (s)' } },
    y: { title: { display: true, text: 'Concentration (%)' } },
  },
}

function TimeSeries({ id }: { id: string }) {
  const [window, setWindow] = useState({ from: '0', to: '60' })
  const [selection, setSelection] = useState(window)
  const params = new URLSearchParams({ experiment_id: id, from_s: selection.from, to_s: selection.to })
  const series = useReading<Series>('/api/series?' + params)
  const data = series.data
  const explainable = channels.filter(({ name }) =>
    data?.units.some(({ channel, unit }) => channel === name && unit) &&
    data.rows.some((row) => row[name] !== null)
  ).map(({ name }) => name)
  return (
    <section className="svg-subpanel p-5 space-y-4" aria-label="Synchronized measurements">
      <h3 className="svg-section-heading">Synchronized measurements</h3>
      <form className="flex flex-wrap items-end gap-3" onSubmit={(event) => {
        event.preventDefault()
        setSelection(window)
      }}>
        <label>From (s) <input className="svg-input w-24 p-1" type="number" min="0" step="any" required value={window.from} onChange={(e) => setWindow({ ...window, from: e.target.value })} /></label>
        <label>To (s) <input className="svg-input w-24 p-1" type="number" min="0" step="any" required value={window.to} onChange={(e) => setWindow({ ...window, to: e.target.value })} /></label>
        <button className="svg-input px-3 py-1">Load window</button>
      </form>
      <p>Choose a window of up to 60 seconds.</p>
      {!data ? <RequestStatus {...series} /> : data.rows.length === 0 ? (
        <p role="status">No measurements in this window.</p>
      ) : (
        <>
          <p role="status">{data.rows.length.toLocaleString()} synchronized rows, {selection.from}–{selection.to} s.{data.truncated && ' The response reached the row limit.'}</p>
          {explainable.length ? (
            <div className="grid gap-4 xl:grid-cols-2">
              {channels.filter(({ name }) => explainable.includes(name)).map(({ name, label, color }) => (
                <div className="h-72 min-w-0" key={name}>
                  <Line aria-label={label + ' concentration over elapsed time'} role="img" options={chartOptions} data={{
                    datasets: [{
                      label: label + ' (%)',
                      data: data.rows.map((row) => ({ x: row.time_s, y: row[name] })),
                      borderColor: color, pointRadius: 0, pointHitRadius: 5, spanGaps: false,
                    }],
                  }} />
                </div>
              ))}
            </div>
          ) : <p>No O₂ or CO₂ readings in this window.</p>}
          {data.source.url && <a className="underline" href={data.source.url}>NASA PSI measurement source</a>}
          {!data.truncated && explainable.map(channel => <DownloadLinks key={channel} id={id}
            selection={{ channel, from_s: selection.from, to_s: selection.to }} />)}
          {!data.truncated && explainable.length > 0 &&
            <ChartAssistant key={params.toString()} id={id}
              from={Number(selection.from)} to={Number(selection.to)} channels={explainable} />}
        </>
      )}
    </section>
  )
}

function TrialDetail({ id }: { id: string }) {
  const detail = useReading<Detail>('/api/experiment?' + new URLSearchParams({ experiment_id: id }))
  if (!detail.data) return <RequestStatus {...detail} />
  const { experiment, conditions } = detail.data
  const context = researchContext[experiment.investigation_id]
  return (
    <section className="svg-subpanel p-5 space-y-4" aria-label="Trial details">
      <h2 className="svg-section-heading">{experiment.study_name} · <code>{id}</code></h2>
      {context && <p>{context.objective} <a className="resource-link" href={context.reference}>NASA study context</a></p>}
      <p>Material: {experiment.material_original ?? 'Not recorded'}</p>
      <p>{[experiment.source_test_id && `Source test: ${experiment.source_test_id}`,
        experiment.source_sample_id && `Sample: ${experiment.source_sample_id}`,
        experiment.test_date && `Test date: ${experiment.test_date}`].filter(Boolean).join(' · ')}</p>
      <dl className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {([
          ['Length (mm)', experiment.length_mm], ['Width (mm)', experiment.width_mm],
          ['Thickness (mm)', experiment.thickness_mm], ['Airflow (cm/s)', experiment.air_velocity_cm_s],
        ] as const).map(([label, value]) => (
          <div key={label}><dt>{label}</dt><dd>{value ?? 'Not recorded'}</dd></div>
        ))}
      </dl>
      <p>{experiment.source_url && <a className="underline" href={experiment.source_url}>NASA PSI source</a>}
        {experiment.source_doi && <> · DOI <code>{experiment.source_doi}</code></>}
        {experiment.repository_version && <> · Version {experiment.repository_version}</>}</p>
      {conditions.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <caption>Experimental conditions</caption>
            <thead><tr>{['Condition', 'Value', 'Bounds', 'Unit', 'Status', 'Qualifier', 'Method', 'Source field'].map((label) => <th className="p-2" scope="col" key={label}>{label}</th>)}</tr></thead>
            <tbody>{conditions.map((condition, index) => (
              <tr key={index}>{[
                condition.field, condition.value,
                condition.lower_bound !== null || condition.upper_bound !== null
                  ? (condition.lower_bound ?? '—') + ' to ' + (condition.upper_bound ?? '—') : null,
                condition.unit, condition.status, condition.qualifier, condition.method?.replaceAll('_', ' '),
                condition.source_column && (condition.source_url
                  ? <a className="resource-link" href={condition.source_url}>{condition.source_column}</a>
                  : condition.source_column),
              ].map((value, column) => <td key={column} className="p-2">{value ?? '—'}</td>)}</tr>
            ))}</tbody>
          </table>
        </div>
      )}
      {conditions.length > 0 && <><ConditionCharts conditions={conditions} /><DownloadLinks id={id} /></>}
      {Number(experiment.saffire_filas) + Number(experiment.cygnus_filas) > 0 ? <TimeSeries id={id} /> : (
        <p>{conditions.length ? 'Test conditions are available in the table above.' : 'This catalog entry provides trial identification and provenance.'} Synchronized measurements are unavailable for this trial.</p>
      )}
    </section>
  )
}

function ConditionCharts({ conditions }: { conditions: Condition[] }) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {['%', 'ppm'].map(unit => {
        const rows = conditions.filter(row => row.unit === unit && row.value !== null).map(row => ({
          label: row.field.replaceAll('_', ' '), value: row.value,
        }))
        return rows.length > 0 && <div key={unit} className="min-w-0"><DynamicBarChart
          rows={rows} labelColumn="label" valueColumn="value" labelTitle="Reported condition"
          valueTitle={'Reading (' + unit + ')'} horizontal /></div>
      })}
    </div>
  )
}

const emptyFilters = { q: '', material: '', objective: '', sensor: '', investigation_id: '', flow_min: '', flow_max: '', direction: '', coverage: '' }
const pageSize = 20

export function Research() {
  const [params] = useSearchParams()
  const { key } = useLocation()
  return <ResearchCatalog key={key}
    investigation={params.get('investigation_id') ?? ''}
    experiment={params.get('experiment_id') ?? ''}
    coverage={Object.keys(resultTypes).includes(params.get('coverage') ?? '') ? params.get('coverage')! : ''} />
}

function ResearchCatalog({ investigation, experiment, coverage }: {
  investigation: string; experiment: string; coverage: string
}) {
  const [draft, setDraft] = useState({ ...emptyFilters, investigation_id: investigation, coverage })
  const [filters, setFilters] = useState(draft)
  const [page, setPage] = useState(1)
  const [trialId, setTrialId] = useState(experiment)
  const catalog = useEvidence()
  const records = catalog.data?.rows ?? []
  const directions = [...new Set(records.flatMap(record => record.flow_direction ? [record.flow_direction] : []))].sort()
  const matches = records.filter(row => {
    const query = filters.q.trim().toLowerCase()
    const context = researchContext[row.investigation_id]
    return (!query || [row.study_name, row.experiment_id, row.investigation_id].some(value => value.toLowerCase().includes(query))) &&
      (!filters.investigation_id || row.investigation_id === filters.investigation_id) &&
      (!filters.material.trim() || materialMatches(row, filters.material)) &&
      (!filters.objective || context?.topics.includes(filters.objective as Objective)) &&
      (!filters.sensor || hasSensor(row, filters.sensor)) &&
      (!filters.direction || row.flow_direction === filters.direction) &&
      (!filters.flow_min || (row.air_velocity_cm_s !== null && row.air_velocity_cm_s >= Number(filters.flow_min))) &&
      (!filters.flow_max || (row.air_velocity_cm_s !== null && row.air_velocity_cm_s <= Number(filters.flow_max))) &&
      matchesResult(row, filters.coverage)
  })
  const invalidFlow = Boolean(draft.flow_min && draft.flow_max && Number(draft.flow_min) > Number(draft.flow_max))
  return (
    <div className="space-y-6">
      <h1 className="svg-page-title text-center">Research</h1>
      {experiment && trialId === experiment && <TrialDetail key={trialId} id={trialId} />}
      <section className="svg-black-panel p-6 md:p-10 space-y-5">
        <form className="flex flex-wrap gap-3 items-end" onSubmit={(event) => {
          event.preventDefault()
          if (invalidFlow) return
          setPage(1)
          setTrialId('')
          setFilters(draft)
        }}>
          <label className="flex flex-col">Study or trial
            <input className="svg-input p-2" maxLength={120} value={draft.q} onChange={(e) => setDraft({ ...draft, q: e.target.value })} />
          </label>
          <label className="flex flex-col">Material / fuel
            <input className="svg-input p-2" maxLength={120} value={draft.material} onChange={e => setDraft({ ...draft, material: e.target.value })} />
          </label>
          {([['objective', 'Research objective', objectives], ['sensor', 'Sensor / measured gas', sensors]] as const)
            .map(([field, label, options]) => <label key={field} className="flex flex-col">{label}
              <select className="svg-input p-2" value={draft[field]} onChange={e => setDraft({ ...draft, [field]: e.target.value })}>
                <option value="">Any</option>
                {Object.entries(options).map(([key, text]) => <option key={key} value={key}>{text}</option>)}
              </select>
            </label>)}
          <label className="flex flex-col">Result type
            <select className="svg-input p-2" value={draft.coverage} onChange={(e) => setDraft({ ...draft, coverage: e.target.value })}>
              <option value="">All trials</option>
              {Object.entries(resultTypes).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
          </label>
          <label className="flex flex-col">Investigation
            <select className="svg-input p-2" value={draft.investigation_id} onChange={(e) => setDraft({ ...draft, investigation_id: e.target.value })}>
              <option value="">All investigations</option>
              {Object.entries(researchContext).map(([id, { name }]) => <option key={id} value={id}>{name}</option>)}
            </select>
          </label>
          <label className="flex flex-col">Flow direction
            <select className="svg-input p-2" value={draft.direction} onChange={e => setDraft({ ...draft, direction: e.target.value })}>
              <option value="">Any</option>
              {directions.map(direction => <option key={direction}>{direction}</option>)}
            </select>
          </label>
          {(['flow_min', 'flow_max'] as const).map((field) => (
            <label key={field} className="flex flex-col">{field === 'flow_min' ? 'Minimum' : 'Maximum'} airflow (cm/s)
              <input className="svg-input w-28 p-2" type="number" min="0" step="any" value={draft[field]} onChange={(e) => setDraft({ ...draft, [field]: e.target.value })} />
            </label>
          ))}
          <button className="svg-input px-4 py-2">Search</button>
        </form>
        {invalidFlow && <p role="alert">Minimum airflow must be at most the maximum.</p>}
        {coverage === 'series' && filters.coverage === 'series' && !trialId &&
          <p>Choose a trial to open its chart and ask a question.</p>}
        {(filters.flow_min || filters.flow_max) && <p>Airflow ranges apply to trials with a verified airflow value in the catalog.</p>}
        {!catalog.data ? <RequestStatus {...catalog} /> : (
          <>
            {matches.length === 0 ? <p role="status">No matching trials.</p> : (
              <ul className="grid gap-2 md:grid-cols-2">
                {matches.slice((page - 1) * pageSize, page * pageSize).map((row) => (
                  <li key={row.experiment_id} className="svg-subpanel space-y-2 p-3">
                    <button type="button" aria-pressed={trialId === row.experiment_id} className="svg-input p-3 text-left w-full" onClick={() => setTrialId(row.experiment_id)}>
                      <strong>{row.study_name} · <code>{row.experiment_id}</code></strong>
                      <span className="block">{row.material_original ?? 'Material not recorded'}</span>
                      <span className="block">{[row.has_series && 'Time series', row.has_conditions && 'Test conditions'].filter(Boolean).join(' · ') || 'Catalog record'}</span>
                    </button>
                    <EvidenceLinks trial={row} source={row.source_url} />
                  </li>
                ))}
              </ul>
            )}
            <nav className="flex items-center gap-3" aria-label="Catalog pages">
              <button className="svg-input px-3 disabled:opacity-50" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</button>
              <span>Page {page} · {matches.length} matching trials</span>
              <button className="svg-input px-3 disabled:opacity-50" disabled={page * pageSize >= matches.length} onClick={() => setPage(page + 1)}>Next</button>
            </nav>
          </>
        )}
      </section>
      {trialId && trialId !== experiment && <TrialDetail key={trialId} id={trialId} />}
    </div>
  )
}
