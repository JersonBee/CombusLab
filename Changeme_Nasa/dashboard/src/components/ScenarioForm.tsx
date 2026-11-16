import { useState } from 'react'
import { objectives, type Scenario } from '../scientificEvidence'

import { scenarios } from '../../../../supabase/functions/_shared/scenarios'
export { scenarios }

const scenarioLabels = { spacecraft: 'Spacecraft in microgravity', lunar: 'Lunar habitat example', martian: 'Martian habitat example' }
export function ScenarioForm({ onApply, submitLabel }: { onApply: (scenario: Scenario) => void; submitLabel: string }) {
  const [draft, setDraft] = useState<Scenario>(scenarios.spacecraft)
  return (
    <form className="flex flex-wrap items-end gap-3" onSubmit={event => {
      event.preventDefault()
      onApply(draft)
    }}>
      <label className="flex flex-col">Scenario preset
        <select className="svg-input p-2" defaultValue="spacecraft" onChange={e => {
          const preset = scenarios[e.target.value as keyof typeof scenarios]
          setDraft(preset)
          onApply(preset)
        }}>
          {Object.entries(scenarioLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select>
      </label>
      <label className="flex flex-col">Safety question
        <select className="svg-input p-2" value={draft.objective} onChange={e => setDraft({ ...draft, objective: e.target.value as Scenario['objective'] })}>
          <option value="">Any objective</option>
          {Object.entries(objectives).map(([key, label]) => <option value={key} key={key}>{label}</option>)}
        </select>
      </label>
      <label className="flex flex-col">Gravity
        <select className="svg-input p-2" value={draft.gravity} onChange={e => setDraft({ ...draft, gravity: e.target.value })}>
          <option value="">Any gravity</option><option value="microgravity">Microgravity</option>
          <option value="lunar">Lunar partial gravity</option><option value="martian">Martian partial gravity</option>
          <option value="earth">Earth gravity</option>
        </select>
      </label>
      {([
        ['oxygen', 'Ambient O₂ (%)', 100], ['pressure', 'Total pressure (psi)', undefined],
        ['airflow', 'Airflow (cm/s)', undefined],
      ] as const).map(([field, label, max]) => (
        <label key={field} className="flex flex-col">{label}
          <input className="svg-input p-2 w-28" type="number" min="0" max={max} step="any"
            value={draft[field]} onChange={e => setDraft({ ...draft, [field]: e.target.value })} />
        </label>
      ))}
      <label className="flex flex-col">Material / fuel
        <input className="svg-input p-2" value={draft.material} onChange={e => setDraft({ ...draft, material: e.target.value })} />
      </label>
      <button className="svg-input px-4 py-2">{submitLabel}</button>
    </form>
  )
}
