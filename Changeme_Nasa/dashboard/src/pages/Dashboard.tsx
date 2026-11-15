import { useState } from 'react'
import { Link } from 'react-router-dom'
import { RequestStatus } from '../components/ScientificReading'
import { useEvidence } from '../components/StudyInventory'
import { TrialSeries } from '../components/TrialSeries'
import { trialPath } from '../scientificEvidence'

const featuredTrial = { experiment_id: 'PSI-100:S1:r2', investigation_id: 'PSI-100' }

export function Dashboard() {
  const catalog = useEvidence()
  const [trialId, setTrialId] = useState(featuredTrial.experiment_id)
  const trials = catalog.data?.rows.filter(trial => trial.series_channels.length > 0) ?? []
  const trial = trials.find(item => item.experiment_id === trialId)
  const studyName = trial?.study_name ?? 'Spacecraft Fire Experiment-III (SAFFIRE-III)'

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="svg-page-title">Dashboard</h1>
        <p>Explore measured gas concentrations from NASA spacecraft combustion experiments.</p>
      </header>
      <section className="svg-black-panel space-y-5 p-4 md:p-8" aria-label="SAFFIRE trial explorer">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-1">
            <p className="svg-section-heading">{studyName}</p>
            <Link className="resource-link" to={trialPath(trial ?? featuredTrial)}>View trial details · <code>{trialId}</code></Link>
          </div>
          <label className="flex min-w-0 max-w-full flex-col">SAFFIRE trial
            <select className="svg-input max-w-full p-2" value={trialId}
              onChange={event => setTrialId(event.target.value)}>
              {!trial && <option value={trialId}>{trialId}</option>}
              {trials.map(item => <option key={item.experiment_id} value={item.experiment_id}>
                {item.experiment_id}{item.material_original ? ' · ' + item.material_original : ''}
              </option>)}
            </select>
          </label>
        </div>
        {!catalog.data && <RequestStatus {...catalog} />}
        <TrialSeries key={trialId} id={trialId} />
      </section>
    </div>
  )
}
