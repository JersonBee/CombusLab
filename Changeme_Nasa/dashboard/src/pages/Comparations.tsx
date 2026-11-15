import { useState } from 'react'
import { Line } from 'react-chartjs-2'
import '../components/Charts'
import { RequestStatus, useReading } from '../components/ScientificReading'
import { DownloadLinks } from '../components/EvidenceLinks'
import { defaultSeriesWindow, isSeriesWindowValid } from '../seriesSelection'
import { channelUnit, compareConditions, hasChannelReadings, overlayLimitation,
  type Channel, type ComparisonConditions, type ComparisonSeries } from '../trialComparison'

type Trial = {
  experiment_id: string
  study_name: string
  material_original: string | null
  has_series: boolean
  has_conditions: boolean
}
type TrialDetails = {
  experiment: ComparisonConditions & {
    source_url: string | null
    source_doi: string | null
  }
  conditions: {
    field: string; value: number | null; unit: string | null; status: string | null
    lower_bound: number | null; upper_bound: number | null; qualifier: string | null
  }[]
}
type Selection = { channel: Channel; from_s: string; to_s: string }
const initialSelection: Selection = { channel: 'o2', ...defaultSeriesWindow }

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

function useTrialDetails(trial: Trial) {
  return useReading<TrialDetails>('/api/experiment?' + new URLSearchParams({ experiment_id: trial.experiment_id }))
}

function TrialCard({ trial, detail }: { trial: Trial; detail: ReturnType<typeof useTrialDetails> }) {
  const record = detail.data
  return (
    <article className="svg-subpanel p-4 space-y-3">
      <h3 className="svg-section-heading">{trial.study_name} · {trial.experiment_id}</h3>
      {!record ? <RequestStatus {...detail} /> : (
        <>
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
  const a = useReading<ComparisonSeries>(query(left))
  const b = useReading<ComparisonSeries>(query(right))
  const seriesA = a.data
  const seriesB = b.data
  const pairs = [{ trial: left, result: a }, { trial: right, result: b }]
  const reason = seriesA && seriesB && overlayLimitation(seriesA, seriesB, selection.channel)
  const invalidWindow = !isSeriesWindowValid(draft)
  return (
    <section className="svg-subpanel p-4 space-y-4">
      <h2 className="svg-section-heading">Compare synchronized series</h2>
      <form className="flex flex-wrap gap-3 items-end" onSubmit={(event) => {
        event.preventDefault()
        if (!invalidWindow) setSelection(draft)
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
      {invalidWindow && <p role="alert">Use an ascending time window of up to 60 seconds.</p>}
      <p>Windows cover up to 60 seconds. Time zero is the first calibrated record of each trial. Review material, geometry and airflow before interpreting differences.</p>
      {pairs.map(({ trial, result }) => !result.data && <RequestStatus key={trial.experiment_id} {...result} />)}
      {reason && <p role="status">Overlay unavailable. {reason}</p>}
      {seriesA && seriesB && reason === '' && (
        <div className="h-80">
          <Line role="img" aria-label="Comparison of synchronized trial measurements" options={{
            responsive: true, maintainAspectRatio: false, parsing: false,
            scales: {
              x: { type: 'linear', title: { display: true, text: 'Elapsed time (s)' } },
              y: { title: { display: true, text: (selection.channel === 'o2' ? 'O₂' : 'CO₂') + ' (' + channelUnit(seriesA, selection.channel) + ')' } },
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
      {pairs.map(({ trial, result }) => result.data && channelUnit(result.data, selection.channel) &&
        hasChannelReadings(result.data, selection.channel) && !result.data.truncated && (
        <div key={trial.experiment_id}><p>{trial.experiment_id} · {result.data.rows.length.toLocaleString()} rows</p>
          <DownloadLinks id={trial.experiment_id} selection={selection} />
        </div>
      ))}
    </section>
  )
}

function SelectedComparison({ left, right }: { left: Trial; right: Trial }) {
  const a = useTrialDetails(left)
  const b = useTrialDetails(right)
  const rows = a.data && b.data ? compareConditions(a.data.experiment, b.data.experiment) : null
  return (
    <>
      {rows && (
        <section className="svg-subpanel space-y-3 p-4">
          <h2 className="svg-section-heading">Experimental conditions side by side</h2>
          <p>Matches reflect the recorded values and study context. Differences and missing values limit how the trials can be interpreted together.</p>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <caption className="sr-only">Comparison of experimental conditions</caption>
              <thead><tr>{['Condition', left.experiment_id, right.experiment_id, 'Assessment'].map(label =>
                <th scope="col" className="p-2" key={label}>{label}</th>)}</tr></thead>
              <tbody>{rows.map(row => (
                <tr key={row.label}><th scope="row" className="p-2">{row.label}</th>
                  <td className="p-2">{row.left ?? 'Not recorded'}</td>
                  <td className="p-2">{row.right ?? 'Not recorded'}</td>
                  <td className="p-2">{row.status}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </section>
      )}
      {left.has_series && right.has_series ? <SeriesComparison left={left} right={right} /> : (
        <p role="status">Overlay unavailable. A time-series overlay requires synchronized measurements from both trials.
          The trial records provide the available conditions for a side-by-side comparison.</p>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        <TrialCard trial={left} detail={a} />
        <TrialCard trial={right} detail={b} />
      </div>
    </>
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
        <SelectedComparison key={JSON.stringify([left.experiment_id, right.experiment_id])} left={left} right={right} />
      ))}
    </div>
  )
}
