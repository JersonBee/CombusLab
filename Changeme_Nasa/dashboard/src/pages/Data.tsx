import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { DownloadLinks, EvidenceLinks } from '../components/EvidenceLinks'
import { RequestStatus } from '../components/ScientificReading'
import { useEvidence } from '../components/StudyInventory'
import { matchesResult, researchContext, resultTypes, type Evidence } from '../scientificEvidence'
import { isSeriesWindowValid, readExportSelection } from '../seriesSelection'

const features = [
  ['length_mm', 'Sample length', 'mm', 'Input'],
  ['width_mm', 'Sample width', 'mm', 'Input'],
  ['thickness_mm', 'Sample thickness', 'mm', 'Input'],
  ['air_velocity_cm_s', 'Airflow speed', 'cm/s', 'Input'],
  ['oxygen_ambient_pct', 'Ambient oxygen', '%', 'Input'],
  ['oxygen_initial_pct', 'Initial tabular oxygen reading', '%', 'Initial condition'],
  ['ignition_power_w', 'Ignition power', 'W', 'Input'],
  ['burn_duration_s', 'Burn duration', 's', 'Candidate outcome'],
] as const

function ModelData({ trial, params }: { trial: Evidence; params: URLSearchParams }) {
  const initialSelection = readExportSelection(params, trial.series_channels)
  const [channel, setChannel] = useState(initialSelection.channel ?? 'o2')
  const [window, setWindow] = useState(initialSelection.window)
  const [selection, setSelection] = useState({ channel, ...window })
  const invalidWindow = !isSeriesWindowValid(window)
  return (
    <section className="svg-subpanel p-4 space-y-4">
      <h2 className="svg-section-heading">{trial.study_name} · <code>{trial.experiment_id}</code></h2>
      <EvidenceLinks trial={trial} source={trial.source_url} />
      <p>Material / fuel · {trial.material_original ?? 'Unavailable'}</p>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead><tr>{['Candidate variable', 'Value', 'Unit', 'Potential model role'].map(label =>
            <th scope="col" className="p-2" key={label}>{label}</th>)}</tr></thead>
          <tbody>{features.map(([field, label, unit, role]) => (
            <tr key={field}>
              <th scope="row" className="p-2">{label}</th>
              <td className="p-2">{trial[field] ?? 'Unavailable'}
                {field === 'oxygen_ambient_pct' && trial.oxygen_ambient_status && ' · ' + trial.oxygen_ambient_status}
              </td>
              <td className="p-2">{unit}</td><td className="p-2">{role}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      {trial.has_conditions && <div className="space-y-2"><h3 className="svg-section-heading">Tabular gas readings</h3>
        <p>The export includes initial and final readings, measurement methods, qualifiers and source fields where recorded.</p>
        <DownloadLinks id={trial.experiment_id} /></div>}
      {trial.series_channels.length > 0 && <>
        <h3 className="svg-section-heading">Synchronized time-series export</h3>
        <form className="flex gap-3 flex-wrap items-end" onSubmit={e => {
          e.preventDefault()
          if (!invalidWindow) setSelection({ channel, ...window })
        }}>
          <label className="flex flex-col">Channel
            <select className="svg-input p-2" value={channel} onChange={e => setChannel(e.target.value as typeof channel)}>
              {trial.series_channels.map(value => <option key={value} value={value}>{value === 'o2' ? 'O₂ (%)' : 'CO₂ (%)'}</option>)}
            </select>
          </label>
          {(['from_s', 'to_s'] as const).map(field => <label className="flex flex-col" key={field}>
            {field === 'from_s' ? 'From (s)' : 'To (s)'}
            <input className="svg-input p-2 w-24" type="number" min="0" step="any" required value={window[field]}
              onChange={e => setWindow({ ...window, [field]: e.target.value })} />
          </label>)}
          <button className="svg-input p-2">Set export window</button>
        </form>
        {invalidWindow && <p role="alert">Use a time window of at most 60 seconds in ascending order.</p>}
        <p>Export selection · {selection.channel.toUpperCase()} · {selection.from_s}–{selection.to_s} s from the first calibrated record.</p>
        <DownloadLinks id={trial.experiment_id} selection={selection} />
      </>}
      {!trial.has_conditions && !trial.series_channels.length &&
        <p>This trial supplies catalog metadata. Quantitative gas data are unavailable for export.</p>}
    </section>
  )
}

export function DataLab() {
  const evidence = useEvidence()
  const [params, setParams] = useSearchParams()
  const [study, setStudy] = useState('')
  const [result, setResult] = useState('')
  const [query, setQuery] = useState('')
  const records = evidence.data?.rows ?? []
  const trial = records.find(record => record.experiment_id === params.get('experiment_id'))
  const available = records.filter(row =>
    (!study || row.investigation_id === study) && matchesResult(row, result) &&
    [row.experiment_id, row.material_original, row.study_name].some(value => value?.toLowerCase().includes(query.trim().toLowerCase())))

  return (
    <div className="space-y-6">
      <h1 className="svg-page-title">Data Lab</h1>
      <section className="svg-black-panel p-6 md:p-10 space-y-4">
        <h2 className="svg-section-heading">Trial data and exports</h2>
        <p>Select a NASA trial to inspect available variables and download its measurements or reported conditions.</p>
        {!evidence.data ? <RequestStatus {...evidence} /> : (
          <>
            <div className="flex flex-wrap gap-3 items-end">
              <label className="flex flex-col">Investigation
                <select className="svg-input p-2" value={study} onChange={e => setStudy(e.target.value)}>
                  <option value="">All investigations</option>
                  {Object.entries(researchContext).map(([id, { name }]) => <option key={id} value={id}>{name}</option>)}
                </select>
              </label>
              <label className="flex flex-col">Available data
                <select className="svg-input p-2" value={result} onChange={e => setResult(e.target.value)}>
                  <option value="">All trials</option>
                  {Object.entries(resultTypes).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                </select>
              </label>
              <label className="flex flex-col">Trial or material
                <input className="svg-input p-2" value={query} onChange={e => setQuery(e.target.value)} />
              </label>
            </div>
            <label className="flex flex-col">Trial · {available.length} matching
              <select className="svg-input p-2" value={trial?.experiment_id ?? ''} onChange={e =>
                setParams(e.target.value ? { experiment_id: e.target.value } : {})}>
                <option value="">Select a trial</option>
                {trial && !available.includes(trial) && <option value={trial.experiment_id}>{trial.experiment_id} (current selection)</option>}
                {available.map(row => <option key={row.experiment_id} value={row.experiment_id}>
                  {row.study_name} · {row.experiment_id}{row.material_original ? ' · ' + row.material_original : ''}
                </option>)}
              </select>
            </label>
            {trial ? <ModelData key={params.toString()} trial={trial} params={params} /> : params.has('experiment_id') && <p role="status">Trial not found.</p>}
          </>
        )}
      </section>
    </div>
  )
}
