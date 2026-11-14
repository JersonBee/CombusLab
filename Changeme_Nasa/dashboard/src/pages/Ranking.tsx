import { useState } from 'react'
import { DynamicBarChart } from '../components/Charts'
import { EvidenceLinks } from '../components/EvidenceLinks'
import { RequestStatus } from '../components/ScientificReading'
import { useEvidence } from '../components/StudyInventory'
import { objectives, rankTrial, type Evidence, type Scenario } from '../scientificEvidence'

const scenarios = {
  spacecraft: { gravity: 'microgravity', oxygen: '', pressure: '', airflow: '', material: '', objective: 'spread' },
  lunar: { gravity: 'lunar', oxygen: '32', pressure: '10.2', airflow: '', material: '', objective: 'materials' },
  martian: { gravity: 'martian', oxygen: '', pressure: '', airflow: '', material: '', objective: 'extinction' },
} satisfies Record<string, Scenario>

const scenarioLabels = { spacecraft: 'Spacecraft in microgravity', lunar: 'Lunar habitat example', martian: 'Martian habitat example' }
const statusLabels = { match: 'Match', different: 'Different', missing: 'Unavailable' }

function rankStudies(trials: Evidence[], scenario: Scenario) {
  const groups = new Map<string, ReturnType<typeof rankTrial>[]>()
  for (const trial of trials) {
    const results = groups.get(trial.investigation_id) ?? []
    results.push(rankTrial(trial, scenario))
    groups.set(trial.investigation_id, results)
  }
  return [...groups.values()].map(results => {
    results.sort((a, b) => b.score - a.score ||
      Number(b.trial.has_series || b.trial.has_conditions) - Number(a.trial.has_series || a.trial.has_conditions) ||
      a.trial.experiment_id.localeCompare(b.trial.experiment_id))
    return {
      best: results[0],
      study: results[0].trial.study_name,
      score: results[0].score,
      matching: results.filter(result => result.matches > 0).length,
      quantitative: results.filter(({ trial }) => trial.has_series || trial.has_conditions).length,
    }
  }).sort((a, b) => b.score - a.score || a.study.localeCompare(b.study))
}

export function Ranking() {
  const evidence = useEvidence()
  const [draft, setDraft] = useState<Scenario>(scenarios.spacecraft)
  const [selection, setSelection] = useState(draft)
  const studies = rankStudies(evidence.data?.rows ?? [], selection)
  const chartRows = studies.map(({ study, score, matching, quantitative }) => ({ study, score, matching, quantitative }))

  return (
    <div className="space-y-6">
      <h1 className="svg-page-title text-center">Ranking</h1>
      <section className="svg-black-panel p-6 md:p-10 space-y-5">
        <h2 className="svg-section-heading">Relevance to a fire-safety scenario</h2>
        <form className="flex flex-wrap items-end gap-3" onSubmit={event => {
          event.preventDefault()
          setSelection(draft)
        }}>
          <label className="flex flex-col">Scenario preset
            <select className="svg-input p-2" defaultValue="spacecraft" onChange={e => {
              const preset = scenarios[e.target.value as keyof typeof scenarios]
              setDraft(preset)
              setSelection(preset)
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
          <button className="svg-input px-4 py-2">Rank studies</button>
        </form>
        <p>Each selected criterion has equal weight. The score is the percentage that matched, including missing criteria in the denominator. Each study is represented by its highest-scoring trial. The score measures relevance of evidence; flammability and fire risk require separate analysis.</p>
        {!evidence.data ? <RequestStatus {...evidence} /> : studies.length === 0 ? <p>No trials available.</p> : (
          <>
            <div className="grid gap-3 xl:grid-cols-3">
              {([
                ['score', 'Best trial relevance (%)'],
                ['matching', 'Trials with at least one match'],
                ['quantitative', 'Trials with series or tabular gas readings'],
              ] as const).map(([column, title]) => (
                <section className="svg-subpanel p-4 min-w-0" key={column}>
                  <h3 className="svg-section-heading">{title}</h3>
                  <DynamicBarChart rows={chartRows} labelColumn="study" valueColumn={column}
                    labelTitle="Investigation" valueTitle={title} horizontal maximum={column === 'score' ? 100 : undefined} />
                </section>
              ))}
            </div>
            <ol className="space-y-3">
              {studies.map(({ best, study, matching, quantitative }, index) => (
                <li className="svg-subpanel p-4 space-y-2" key={best.trial.investigation_id}>
                  <h3 className="svg-section-heading">{index + 1}. {study} · {best.score}%</h3>
                  <p>{matching} trials matched at least one criterion · {quantitative} trials with series or tabular gas readings</p>
                  <EvidenceLinks trial={best.trial} source={best.trial.source_url} />
                  <details open={index === 0}>
                    <summary className="cursor-pointer">Scoring evidence for the representative trial</summary>
                    {best.criteria.length === 0 ? <p>Select a criterion to calculate relevance.</p> : (
                      <ul className="list-disc pl-5">
                        {best.criteria.map(criterion => <li key={criterion.label}>
                          <strong>{criterion.label}</strong> · {statusLabels[criterion.status]} · {criterion.evidence}
                        </li>)}
                      </ul>
                    )}
                  </details>
                </li>
              ))}
            </ol>
          </>
        )}
      </section>
    </div>
  )
}
