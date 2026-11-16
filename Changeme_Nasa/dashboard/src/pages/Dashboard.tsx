import { useState } from 'react'
import { Link } from 'react-router-dom'
import { RequestStatus } from '../components/ScientificReading'
import { useEvidence } from '../components/StudyInventory'
import { TrialSeries } from '../components/TrialSeries'
import { trialPath } from '../scientificEvidence'
import { cldFlame } from '../cldFlame'

const featuredTrial = { experiment_id: 'PSI-100:S1:r2', investigation_id: 'PSI-100' }

const flamePixels = [
  '.......b......',
  '......bcc.....',
  '.....bcccb....',
  '.....bcccb....',
  '..b.bccwccb...',
  '..bbccwwccbb..',
  '.bbccwwwwccbb.',
  '.bccw.ww.wccb.',
  '.bccww..wwccb.',
  '.bbccwwwwccbb.',
  '..bbccccccbb..',
  '...bbbbbbbb...',
]

const pixelColors = { b: 'var(--color-orbital)', c: 'var(--color-cyan)', w: 'var(--color-ink)' }

function PixelFlame() {
  return (
    <figure className="orbital-sketch" aria-hidden="true">
      <div className="orbital-sketch-grid">
        <span className="orbital-sketch-spark" />
        <div className="pixel-flame">
          {flamePixels.flatMap((row, y) => Array.from(row, (pixel, x) => {
            const color = pixelColors[pixel as keyof typeof pixelColors]
            return color ? <span key={y * 14 + x} style={{ gridArea: `${y + 1} / ${x + 1}`, backgroundColor: color }} /> : null
          }))}
        </div>
      </div>
      <figcaption>Little flame, meet orbit.</figcaption>
    </figure>
  )
}

export function Dashboard() {
  const catalog = useEvidence()
  const [trialId, setTrialId] = useState(featuredTrial.experiment_id)
  const trials = catalog.data?.rows.filter(trial => trial.series_channels.length > 0) ?? []
  const trial = trials.find(item => item.experiment_id === trialId)
  const studyName = trial?.study_name ?? 'Spacecraft Fire Experiment-III (SAFFIRE-III)'

  return (
    <div className="space-y-6">
      <header className="orbital-hero">
        <div className="orbital-hero-content">
          <h1>Fire in microgravity</h1>
          <p>What happens to a flame in orbit? Explore NASA’s experiments one reading at a time.</p>
          <Link className="resource-link orbital-notebook-link" to={cldFlame.path}>Open the ACME field notes <span aria-hidden="true">↗</span></Link>
        </div>
        <PixelFlame />
      </header>
      <section className="svg-black-panel orbital-science-panel space-y-5 p-4 md:p-7" aria-label="SAFFIRE trial explorer">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="grid gap-1">
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
        <TrialSeries key={trialId} id={trialId} showAssistant />
      </section>
    </div>
  )
}
