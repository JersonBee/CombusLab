import { useState } from 'react'
import { Line } from 'react-chartjs-2'
import '../components/Charts'
import { RequestStatus, useReading } from '../components/ScientificReading'

type Trial = {
  experiment_id: string
  study_name: string
  material_original: string | null
  has_series: boolean
  has_conditions: boolean
}
type TrialDetails = {
  experiment: {
    source_url: string | null
    source_doi: string | null
    air_velocity_cm_s: number | null
    length_mm: number | null
    width_mm: number | null
    thickness_mm: number | null
  }
  conditions: {
    field: string; value: number | null; unit: string | null; status: string | null
    lower_bound: number | null; upper_bound: number | null; qualifier: string | null
  }[]
}
type Channel = 'o2' | 'co2'
type Series = {
  units: { channel: string; unit: string }[]
  time_reference: string
  time_unit: string
  truncated: boolean
  rows: { time_s: number; o2: number | null; co2: number | null }[]
}
type Selection = { channel: Channel; from_s: string; to_s: string }
const initialSelection: Selection = { channel: 'o2', from_s: '0', to_s: '60' }

function TrialPicker({ label, trial, onSelect }: { label: string; trial?: Trial; onSelect: (row: Trial) => void }) {
  const [input, setInput] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const catalog = useReading<{ rows: Trial[]; has_next: boolean }>(
    '/api/catalog?' + new URLSearchParams({ q: search, page: String(page) }),
  )
  return (
    <section className="svg-subpanel p-4 space-y-3" aria-label={label}>
      <h2 className="svg-section-heading">{label}</h2>
      <form className="flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); setSearch(input); setPage(1) }}>
        <label className="flex flex-col">Study, trial or material
          <input className="svg-input p-2" maxLength={120} value={input} onChange={(e) => setInput(e.target.value)} />
        </label>
        <button className="svg-input px-3 self-end py-2">Search</button>
      </form>
      {!catalog.data ? <RequestStatus {...catalog} /> : (
        <>
          {catalog.data.rows.length ? (
            <select aria-label={'Choose ' + label} className="svg-input w-full p-2" value={trial?.experiment_id ?? ''} onChange={(e) => {
              const selected = catalog.data?.rows.find((row) => row.experiment_id === e.target.value)
              if (selected) onSelect(selected)
            }}>
              <option value="" disabled>Select a trial</option>
              {trial && !catalog.data.rows.some((row) => row.experiment_id === trial.experiment_id) && <option value={trial.experiment_id}>{trial.experiment_id}</option>}
              {catalog.data.rows.map((row) => <option key={row.experiment_id} value={row.experiment_id}>{row.study_name} · {row.experiment_id}</option>)}
            </select>
          ) : <p role="status">No matching trials.</p>}
          <div className="flex gap-3 items-center">
            <button className="svg-input px-2" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</button>
            <span>Page {page}</span>
            <button className="svg-input px-2" disabled={!catalog.data.has_next} onClick={() => setPage(page + 1)}>Next</button>
          </div>
        </>
      )}
      {trial && <p>{trial.material_original ?? 'Material not recorded'} · {[
        trial.has_series && 'Time series', trial.has_conditions && 'Test conditions',
      ].filter(Boolean).join(' · ') || 'Catalog record'}</p>}
    </section>
  )
}

function DownloadLinks({ id, selection }: { id: string; selection?: Selection }) {
  const search = { experiment_id: id, mode: selection ? 'series' : 'conditions', ...selection }
  return (
    <p className="flex gap-3">
      {['csv', 'json'].map((format) => (
        <a key={format} className="underline" href={'/api/export?' + new URLSearchParams({ ...search, format })} download>
          Download {selection ? 'channel' : 'conditions'} ({format.toUpperCase()})
        </a>
      ))}
    </p>
  )
}

function TrialCard({ trial }: { trial: Trial }) {
  const detail = useReading<TrialDetails>('/api/experiment?' + new URLSearchParams({ experiment_id: trial.experiment_id }))
  const record = detail.data
  return (
    <article className="svg-subpanel p-4 space-y-3">
      <h3 className="svg-section-heading">{trial.study_name} · {trial.experiment_id}</h3>
      {!record ? <RequestStatus {...detail} /> : (
        <>
          <dl className="grid grid-cols-2 gap-2">
            {([
              ['Material', trial.material_original], ['Airflow (cm/s)', record.experiment.air_velocity_cm_s],
              ['Length (mm)', record.experiment.length_mm], ['Width (mm)', record.experiment.width_mm],
              ['Thickness (mm)', record.experiment.thickness_mm],
            ] as const).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value ?? 'Not recorded'}</dd></div>)}
          </dl>
          {record.experiment.source_url && <a className="underline" href={record.experiment.source_url}>NASA PSI source</a>}
          {record.experiment.source_doi && <p>DOI {record.experiment.source_doi}</p>}
          {record.conditions.length > 0 && (
            <>
              <h4>Experimental conditions</h4>
              <dl className="space-y-2">
                {record.conditions.map((condition, index) => (
                  <div key={index}>
                    <dt>{condition.field}</dt>
                    <dd>{condition.value ?? '—'} {condition.unit} {condition.status} {condition.qualifier}
                      {(condition.lower_bound !== null || condition.upper_bound !== null) && <> · Bounds {condition.lower_bound ?? '—'} to {condition.upper_bound ?? '—'}</>}
                    </dd>
                  </div>
                ))}
              </dl>
              <DownloadLinks id={trial.experiment_id} />
            </>
          )}
        </>
      )}
    </article>
  )
}

function SeriesComparison({ left, right }: { left: Trial; right: Trial }) {
  const [draft, setDraft] = useState(initialSelection)
  const [selection, setSelection] = useState(initialSelection)
  const query = (trial: Trial) => '/api/series?' + new URLSearchParams({
    experiment_id: trial.experiment_id, from_s: selection.from_s, to_s: selection.to_s,
  })
  const a = useReading<Series>(query(left))
  const b = useReading<Series>(query(right))
  const seriesA = a.data
  const seriesB = b.data
  const unit = (data: Series) => data.units.find((item) => item.channel === selection.channel)?.unit
  const hasReadings = (data: Series) => data.rows.some((row) => row[selection.channel] !== null)
  const pairs = [{ trial: left, result: a }, { trial: right, result: b }]
  const reason = seriesA && seriesB && (
    !hasReadings(seriesA) || !hasReadings(seriesB) ? 'The selected channel has no readings for one or both trials in this window.'
    : !unit(seriesA) || unit(seriesA) !== unit(seriesB) ? 'The units are missing or differ for this channel.'
    : seriesA.time_reference !== 'first_calibrated_record' || seriesB.time_reference !== seriesA.time_reference ||
      seriesA.time_unit !== 's' || seriesB.time_unit !== 's' ? 'The time references are incompatible.'
    : seriesA.truncated || seriesB.truncated ? 'Choose a smaller window to compare both series completely.'
    : ''
  )
  return (
    <section className="svg-subpanel p-4 space-y-4">
      <h2 className="svg-section-heading">Compare synchronized series</h2>
      <form className="flex flex-wrap gap-3 items-end" onSubmit={(event) => {
        event.preventDefault()
        setSelection(draft)
      }}>
        <label className="flex flex-col">Channel
          <select className="svg-input p-2" value={draft.channel} onChange={(e) => setDraft({ ...draft, channel: e.target.value as Channel })}>
            <option value="o2">O₂</option><option value="co2">CO₂</option>
          </select>
        </label>
        {(['from_s', 'to_s'] as const).map((field) => (
          <label key={field} className="flex flex-col">{field === 'from_s' ? 'From (s)' : 'To (s)'}
            <input type="number" className="svg-input w-24 p-2" min="0" step="any" required value={draft[field]} onChange={(e) => setDraft({ ...draft, [field]: e.target.value })} />
          </label>
        ))}
        <button className="svg-input p-2">Load window</button>
      </form>
      <p>Windows cover up to 60 seconds. Time zero is the first calibrated record of each trial. Review material, geometry and airflow before interpreting differences.</p>
      {pairs.map(({ trial, result }) => !result.data && <RequestStatus key={trial.experiment_id} {...result} />)}
      {reason && <p role="status">{reason}</p>}
      {seriesA && seriesB && reason === '' && (
        <div className="h-80">
          <Line role="img" aria-label="Comparison of synchronized trial measurements" options={{
            responsive: true, maintainAspectRatio: false, parsing: false,
            scales: {
              x: { type: 'linear', title: { display: true, text: 'Elapsed time (s)' } },
              y: { title: { display: true, text: (selection.channel === 'o2' ? 'O₂' : 'CO₂') + ' (' + unit(seriesA) + ')' } },
            },
          }} data={{ datasets: [seriesA, seriesB].map((series, index) => ({
            label: index === 0 ? left.experiment_id : right.experiment_id,
            data: series.rows.map((row) => ({ x: row.time_s, y: row[selection.channel] })),
            borderColor: index === 0 ? '#B7E4F9' : '#FEB352',
            borderDash: index === 0 ? [] : [5, 4],
            pointRadius: 0, pointHitRadius: 5, spanGaps: false,
          })) }} />
        </div>
      )}
      {pairs.map(({ trial, result }) => result.data && hasReadings(result.data) && !result.data.truncated && (
        <div key={trial.experiment_id}><p>{trial.experiment_id} · {result.data.rows.length.toLocaleString()} rows</p>
          <DownloadLinks id={trial.experiment_id} selection={selection} />
        </div>
      ))}
    </section>
  )
}

export function Comparations() {
  const [left, setLeft] = useState<Trial>()
  const [right, setRight] = useState<Trial>()
  return (
    <div className="space-y-6">
      <h1 className="svg-page-title text-center">Compare trials</h1>
      <div className="grid gap-4 md:grid-cols-2">
        <TrialPicker label="Trial A" trial={left} onSelect={setLeft} />
        <TrialPicker label="Trial B" trial={right} onSelect={setRight} />
      </div>
      {left && right && (left.experiment_id === right.experiment_id ? <p role="status">Select two distinct trials.</p> : (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <TrialCard key={left.experiment_id} trial={left} />
            <TrialCard key={right.experiment_id} trial={right} />
          </div>
          {left.has_series && right.has_series ? (
            <SeriesComparison key={left.experiment_id + '/' + right.experiment_id} left={left} right={right} />
          ) : <p role="status">A time-series overlay requires synchronized measurements for both trials. Use the trial records to compare the available conditions.</p>}
        </>
      ))}
    </div>
  )
}
