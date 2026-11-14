import { Link } from 'react-router-dom'
import { trialPath, type Trial } from '../scientificEvidence'

export function EvidenceLinks({ trial, source }: {
  trial: Pick<Trial, 'experiment_id' | 'investigation_id'>; source?: string | null
}) {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1">
      <Link className="resource-link" to={trialPath(trial)}>Trial <code>{trial.experiment_id}</code></Link>
      {source && <a className="resource-link" href={source}>NASA PSI source</a>}
    </div>
  )
}

export function DownloadLinks({ id, selection }: {
  id: string; selection?: { channel: 'o2' | 'co2'; from_s: string; to_s: string }
}) {
  const search = { experiment_id: id, mode: selection ? 'series' : 'conditions', ...selection }
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1">
      {['csv', 'json'].map(format => (
        <a key={format} className="resource-link" href={'/api/export?' + new URLSearchParams({ ...search, format })} download>
          Download {selection ? 'channel' : 'conditions'} ({format.toUpperCase()})
        </a>
      ))}
    </div>
  )
}
