import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Line } from 'react-chartjs-2'
import type { ChartOptions } from 'chart.js'
import '../components/Charts'
import { FlameTitle } from '../components/FlameTitle'
import { useReading, RequestStatus } from '../components/ScientificReading'
import { ChartAssistant } from '../components/ChartAssistant'

const studies = [
  ['PSI-98', 'SAFFIRE-I'], ['PSI-99', 'SAFFIRE-II'], ['PSI-100', 'SAFFIRE-III'],
  ['PSI-26', 'BASS'], ['PSI-25', 'BASS-II'],
]
const channels = [
  { name: 'o2', label: 'O₂', color: '#B7E4F9' },
  { name: 'co2', label: 'CO₂', color: '#FEB352' },
] as const

type Trial = {
  experiment_id: string
  study_name: string
  material_original: string | null
  has_series: boolean
  has_conditions: boolean
}
type Catalog = { has_next: boolean; rows: Trial[] }
type Condition = {
  field: string
  value: number | null
  lower_bound: number | null
  upper_bound: number | null
  unit: string | null
  status: string | null
  qualifier: string | null
  source_column: string | null
}
type Detail = {
  experiment: {
    study_name: string; material_original: string | null; source_url: string | null
    source_doi: string | null; repository_version: string | null
    thickness_mm: number | null; length_mm: number | null; width_mm: number | null
    air_velocity_cm_s: number | null
    source_test_id: string | null; source_sample_id: string | null; test_date: string | null
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
          {channels.some(({ name }) => data.rows.some((row) => row[name] !== null)) ? (
            <div className="h-80">
              <Line aria-label="Oxygen and carbon dioxide over elapsed time" role="img" options={chartOptions} data={{
                datasets: channels.map(({ name, label, color }) => ({
                  label: label + ' (' + (data.units.find((unit) => unit.channel === name)?.unit ?? 'unit unavailable') + ')',
                  data: data.rows.map((row) => ({ x: row.time_s, y: row[name] })),
                  borderColor: color, pointRadius: 0, pointHitRadius: 5, spanGaps: false,
                })),
              }} />
            </div>
          ) : <p>No O₂ or CO₂ readings in this window.</p>}
          {data.source.url && <a className="underline" href={data.source.url}>NASA PSI measurement source</a>}
          {!data.truncated && explainable.length > 0 &&
            <ChartAssistant key={params.toString()} id={id}
              from={Number(selection.from)} to={Number(selection.to)} channels={explainable} />}
        </>
      )}
    </section>
  )
}

function TrialDetail({ trial }: { trial: Trial }) {
  const detail = useReading<Detail>('/api/experiment?' + new URLSearchParams({ experiment_id: trial.experiment_id }))
  if (!detail.data) return <RequestStatus {...detail} />
  const { experiment, conditions } = detail.data
  return (
    <section className="svg-subpanel p-5 space-y-4" aria-label="Trial details">
      <h2 className="svg-section-heading">{experiment.study_name} · {trial.experiment_id}</h2>
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
        {experiment.source_doi && <> · DOI {experiment.source_doi}</>}
        {experiment.repository_version && <> · Version {experiment.repository_version}</>}</p>
      {conditions.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <caption>Experimental conditions</caption>
            <thead><tr>{['Condition', 'Value', 'Bounds', 'Unit', 'Status', 'Qualifier', 'Source field'].map((label) => <th className="p-2" scope="col" key={label}>{label}</th>)}</tr></thead>
            <tbody>{conditions.map((condition, index) => (
              <tr key={index}>{[
                condition.field, condition.value,
                condition.lower_bound !== null || condition.upper_bound !== null
                  ? (condition.lower_bound ?? '—') + ' to ' + (condition.upper_bound ?? '—') : null,
                condition.unit, condition.status, condition.qualifier, condition.source_column,
              ].map((value, column) => <td key={column} className="p-2">{value ?? '—'}</td>)}</tr>
            ))}</tbody>
          </table>
        </div>
      )}
      {trial.has_series ? <TimeSeries id={trial.experiment_id} /> : (
        <p>{conditions.length ? 'Test conditions are available in the table above.' : 'This catalog entry provides trial identification and provenance.'} Synchronized measurements are unavailable for this trial.</p>
      )}
    </section>
  )
}

const emptyFilters = { q: '', investigation_id: '', flow_min: '', flow_max: '', coverage: '' }

export function Research() {
  const [params] = useSearchParams()
  const investigation = params.get('investigation_id') ?? ''
  return <ResearchCatalog key={investigation} investigation={investigation} />
}

function ResearchCatalog({ investigation }: { investigation: string }) {
  const [draft, setDraft] = useState({ ...emptyFilters, investigation_id: investigation })
  const [filters, setFilters] = useState(draft)
  const [page, setPage] = useState(1)
  const [trial, setTrial] = useState<Trial>()
  const catalog = useReading<Catalog>('/api/catalog?' + new URLSearchParams({ ...filters, page: String(page) }))
  return (
    <div className="space-y-6">
      <FlameTitle>Research</FlameTitle>
      <section className="svg-black-panel p-6 md:p-10 space-y-5">
        <form className="flex flex-wrap gap-3 items-end" onSubmit={(event) => {
          event.preventDefault()
          setPage(1)
          setTrial(undefined)
          setFilters(draft)
        }}>
          <label className="flex flex-col">Study, trial or material
            <input className="svg-input p-2" maxLength={120} value={draft.q} onChange={(e) => setDraft({ ...draft, q: e.target.value })} />
          </label>
          <label className="flex flex-col">Available evidence
            <select className="svg-input p-2" value={draft.coverage} onChange={(e) => setDraft({ ...draft, coverage: e.target.value })}>
              <option value="">All trials</option>
              <option value="series">Synchronized series</option>
              <option value="conditions">Tabular conditions</option>
              <option value="catalog">Catalog metadata</option>
            </select>
          </label>
          <label className="flex flex-col">Investigation
            <select className="svg-input p-2" value={draft.investigation_id} onChange={(e) => setDraft({ ...draft, investigation_id: e.target.value })}>
              <option value="">All investigations</option>
              {studies.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
            </select>
          </label>
          {(['flow_min', 'flow_max'] as const).map((field) => (
            <label key={field} className="flex flex-col">{field === 'flow_min' ? 'Minimum' : 'Maximum'} airflow (cm/s)
              <input className="svg-input w-28 p-2" type="number" min="0" step="any" value={draft[field]} onChange={(e) => setDraft({ ...draft, [field]: e.target.value })} />
            </label>
          ))}
          <button className="svg-input px-4 py-2">Search</button>
        </form>
        {(filters.flow_min || filters.flow_max) && <p>Airflow ranges apply to trials with a verified airflow value in the catalog.</p>}
        {!catalog.data ? <RequestStatus {...catalog} /> : (
          <>
            {catalog.data.rows.length === 0 ? <p role="status">No matching trials.</p> : (
              <ul className="grid gap-2 md:grid-cols-2">
                {catalog.data.rows.map((row) => (
                  <li key={row.experiment_id}>
                    <button type="button" aria-pressed={trial?.experiment_id === row.experiment_id} className="svg-input p-3 text-left w-full" onClick={() => setTrial(row)}>
                      <strong>{row.study_name} · {row.experiment_id}</strong>
                      <span className="block">{row.material_original ?? 'Material not recorded'}</span>
                      <span className="block">{[row.has_series && 'Time series', row.has_conditions && 'Test conditions'].filter(Boolean).join(' · ') || 'Catalog record'}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <nav className="flex items-center gap-3" aria-label="Catalog pages">
              <button className="svg-input px-3 disabled:opacity-50" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</button>
              <span>Page {page}</span>
              <button className="svg-input px-3 disabled:opacity-50" disabled={!catalog.data.has_next} onClick={() => setPage(page + 1)}>Next</button>
            </nav>
          </>
        )}
      </section>
      {trial && <TrialDetail key={trial.experiment_id} trial={trial} />}
    </div>
  )
}
