import { useAssistantContext } from '../assistantContext'
import { useState } from 'react'
import { DynamicBarChart } from '../components/Charts'
import { EvidenceLinks } from '../components/EvidenceLinks'
import { RequestStatus } from '../components/ScientificReading'
import { useEvidence } from '../components/StudyInventory'
import { ScenarioForm, scenarios } from '../components/ScenarioForm'
import { CldFlameRelevance } from '../components/CldFlameEvidence'
import { rankStudies, statusLabels, type Scenario } from '../scientificEvidence'

export function Ranking() {
  const evidence = useEvidence()
  const [selection, setSelection] = useState<Scenario>(scenarios.spacecraft)
  useAssistantContext({ scenario: selection, chart: { kind: 'ranking' } })
  const studies = rankStudies(evidence.data?.rows ?? [], selection)
  const chartRows = studies.map(({ study, score, matching, quantitative }) => ({ study, score, matching, quantitative }))

  return (
    <div className="space-y-6">
      <h1 className="svg-page-title text-center">Ranking</h1>
      <section className="svg-black-panel p-6 md:p-10 space-y-5">
        <h2 className="svg-section-heading">Relevance to a fire-safety scenario</h2>
        <ScenarioForm onApply={setSelection} submitLabel="Rank studies" />
        <p>Each selected criterion has equal weight. The score is the percentage that matched, including missing criteria in the denominator. Trial-level results represent each study by its highest-scoring trial. Tied trials with quantitative evidence are shown first, then ordered by trial ID. Scores represent scenario relevance.</p>
        <CldFlameRelevance scenario={selection} />
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
                  <h3 className="svg-section-heading">{index + 1}. {study} · {best.criteria.length ? best.score + "%" : "No criteria selected"}</h3>
                  <p>{best.matches} of {best.criteria.length} criteria match · {matching} trials matched at least one criterion · {quantitative} trials with series or tabular gas readings</p>
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
