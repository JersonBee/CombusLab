import { useAssistantContext } from '../assistantContext'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import assistantIcon from '../assets/pixil-frame-0.svg'
import saffireI from '../assets/saffire-i-fronts.webp'
import saffireIII from '../assets/saffire-iii-fronts.webp'
import { TrialSeries } from '../components/TrialSeries'
import { airflowNote, clockNote, makeEvidenceNote, measurements, notebookSources, observation, openQuestion } from '../flightNotebook'

const trials = [
  {
    id: 'PSI-98:S1:r2', name: 'SAFFIRE-I', airflow: 20, burn: 400, image: saffireI, height: 706,
    fronts: [96, 86, 78, 69, 62, 55, 47, 39, 31, 23, 15],
  },
  {
    id: 'PSI-100:S1:r2', name: 'SAFFIRE-III', airflow: 25, burn: 320, image: saffireIII, height: 707,
    fronts: [97, 84, 73, 64, 54, 44, 35, 25, 13],
  },
] as const
// Heights are visual annotations in the published crops, not measured flame positions.
const frameCount = Math.max(...trials.map(trial => trial.fronts.length))
const comparePath = '/compare?' + new URLSearchParams({ a: trials[0].id, b: trials[1].id })
const control = 'svg-input px-3 py-2 disabled:opacity-45'

export function FlightNotebook() {
  const [measurement, setMeasurement] = useState('')
  const [annotation, setAnnotation] = useState('')
  const [reading, setReading] = useState('')
  useAssistantContext(reading ? {} : { chart: { kind: 'flame-fronts' } })
  const selected = measurements.find(option => option.id === measurement)

  function downloadNote() {
    if (!selected) return
    const file = new Blob([makeEvidenceNote(selected, annotation)], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(file)
    const link = document.createElement('a')
    link.href = url
    link.download = 'flight-notebook-saffire.md'
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="svg-page-title">Flight Notebook</h1>
        <h2 className="svg-section-heading">Same fabric, different airflow</h2>
        <p>What would you test next to understand how ventilation affects flame spread?</p>
      </header>
      <FlameSequence />
      <section className="svg-black-panel space-y-4 p-4 md:p-7" aria-labelledby="notebook-gases">
        <h2 className="svg-section-heading" id="notebook-gases">Explore the gas readings</h2>
        <p>Oxygen and carbon dioxide readings describe what reached the gas sensors. Use the chart assistant to explain a channel or compare the two gases within a trial.</p>
        <p className="text-sm text-muted">{clockNote}</p>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1">Trial readings
            <select id="notebook-trial-readings" className={control} value={reading} onChange={event => setReading(event.target.value)}>
              <option value="">Choose a trial</option>
              {trials.map(trial => <option key={trial.id} value={trial.id}>{trial.name}</option>)}
            </select>
          </label>
          <Link className="resource-link py-2" to={comparePath}>Compare both trial records</Link>
        </div>
        {reading && <TrialSeries key={reading} id={reading} showAssistant />}
      </section>
      <section className="svg-subpanel space-y-4 p-4 md:p-6" aria-labelledby="notebook-plan">
        <h2 className="svg-section-heading" id="notebook-plan">Plan the next measurement</h2>
        <fieldset className="space-y-2">
          <legend className="mb-2">Which measurement would you collect next?</legend>
          {measurements.map(({ id, label }) => (
            <label className="flex items-center gap-2 py-1" key={id}>
              <input className="accent-cyan" type="radio" name="next-measurement" value={id}
                checked={measurement === id} onChange={() => setMeasurement(id)} />{label}
            </label>
          ))}
        </fieldset>
        <div aria-live="polite">
          {selected && <p className="border-l-2 border-cyan pl-3">{selected.feedback}</p>}
        </div>
        {selected && <section className="svg-black-panel space-y-4 p-4 md:p-6" aria-labelledby="notebook-note">
          <h3 className="svg-section-heading" id="notebook-note">Evidence note</h3>
          <dl className="space-y-3">
            <div><dt className="font-semibold">Observation</dt><dd>{observation}</dd></div>
            <div><dt className="font-semibold">Next measurement</dt><dd>{selected.label}</dd></div>
            <div><dt className="font-semibold">Open question</dt><dd>{openQuestion}</dd></div>
          </dl>
          <label className="flex flex-col gap-2">My notes (optional)
            <textarea className="svg-input p-3" rows={3} maxLength={1500} value={annotation}
              onChange={event => setAnnotation(event.target.value)} />
          </label>
          <ul className="flex flex-wrap gap-x-4 gap-y-2">
            {notebookSources.map(({ label, url }) => <li key={url}><a className="resource-link" href={url}>{label}</a></li>)}
          </ul>
          <button className={control} type="button" onClick={downloadNote}>
            Download evidence note (.md)
          </button>
        </section>}
      </section>
    </div>
  )
}

function FlameSequence() {
  const [frame, setFrame] = useState(0)
  const [playing, setPlaying] = useState(false)
  const lastFrame = frame === frameCount - 1
  const isPlaying = playing && !lastFrame

  useEffect(() => {
    if (!isPlaying) return
    const timer = window.setTimeout(() => setFrame(frame + 1), 850)
    return () => window.clearTimeout(timer)
  }, [frame, isPlaying])

  function seek(nextFrame: number) {
    setPlaying(false)
    setFrame(nextFrame)
  }

  function togglePlayback() {
    if (lastFrame) setFrame(0)
    setPlaying(!isPlaying)
  }

  return (
    <section className="svg-black-panel space-y-4 p-4 md:p-7" aria-labelledby="notebook-sequence">
      <h2 className="svg-section-heading" id="notebook-sequence">Follow the flame fronts</h2>
      <p>Start at the ignition edge and follow the flame up the fabric. Each step marks a front in the published NASA composites. The original images within each trial were taken 40 seconds apart.</p>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Flame sequence controls">
        <button className={control} type="button" onClick={() => seek(frame - 1)} disabled={frame === 0}>Previous</button>
        <button className={control} type="button" onClick={togglePlayback}>
          {isPlaying ? 'Pause' : lastFrame ? 'Replay sequence' : 'Play sequence'}
        </button>
        <button className={control} type="button" onClick={() => seek(frame + 1)} disabled={lastFrame}>Next</button>
      </div>
      <ol className="flex flex-wrap gap-2" aria-label="Published flame fronts">
        {Array.from({ length: frameCount }, (_, index) => (
          <li key={index}>
            <button type="button" aria-label={'Front ' + (index + 1)} aria-current={frame === index ? 'step' : undefined}
              className="svg-input relative grid size-10 place-items-center aria-[current=step]:border-cyan aria-[current=step]:text-cyan"
              onClick={() => seek(index)}>
              {frame === index ? <img src={assistantIcon} alt="" className="size-7" /> : index + 1}
            </button>
          </li>
        ))}
      </ol>
      <p className="text-sm" aria-live={isPlaying ? 'off' : 'polite'}>Step {frame + 1} of {frameCount}</p>
      <div className="grid max-w-[28rem] grid-cols-2 gap-3 sm:gap-6">
        {trials.map(trial => {
          const front = trial.fronts[frame]
          return <figure key={trial.id} className="min-w-0 space-y-2">
            <div className="relative overflow-hidden rounded border border-line">
              <img src={trial.image} width={313} height={trial.height}
                alt={trial.name + ' composite with bright orange flame fronts rising from the ignition edge'}
                className="w-full" />
              {front !== undefined && <span aria-hidden="true"
                className="pointer-events-none absolute left-1/2 size-5 -translate-x-1/2 -translate-y-1/2 border-2 border-cyan shadow-[0_0_0_2px_#041226]"
                style={{ top: front + '%' }} />}
            </div>
            <figcaption>
              <strong>{trial.name}</strong> · {trial.airflow} cm/s
              <span className="block text-sm text-muted">Burn duration {trial.burn} s</span>
              <span className="block text-sm">{front === undefined ? 'End of this sequence' : 'Front ' + (frame + 1) + ' of ' + trial.fronts.length}</span>
            </figcaption>
          </figure>
        })}
      </div>
      <p>{observation}</p>
      <p className="text-sm text-muted">{airflowNote}</p>
      <ul className="flex flex-wrap gap-x-4 gap-y-2">
        {notebookSources.slice(0, 2).map(({ label, url }) => <li key={url}><a className="resource-link" href={url}>{label}</a></li>)}
      </ul>
    </section>
  )
}
