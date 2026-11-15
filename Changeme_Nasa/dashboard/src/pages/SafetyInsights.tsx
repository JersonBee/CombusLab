import { useState } from 'react'
import { Link } from 'react-router-dom'
import { EvidenceLinks } from '../components/EvidenceLinks'
import { ScenarioForm, scenarios } from '../components/ScenarioForm'
import { RequestStatus } from '../components/ScientificReading'
import { useEvidence } from '../components/StudyInventory'
import { rankStudies, researchContext, summarizeScenario, type Scenario } from '../scientificEvidence'

export function SafetyInsights() {
  const evidence = useEvidence()
  const [scenario, setScenario] = useState<Scenario>(scenarios.spacecraft)
  const trials = evidence.data?.rows ?? []
  const coverage = summarizeScenario(trials, scenario)
  const candidates = rankStudies(trials, scenario).filter(study => study.best.matches > 0)
  const fullMatches = candidates.reduce((total, study) => total + study.fullMatches, 0)
  const gaps = coverage.filter(criterion => criterion.missing > 0 || criterion.match === 0)

  return (
    <div className="space-y-6">
      <h1 className="svg-page-title">Safety Insights</h1>
      <section className="svg-black-panel space-y-4 p-4 md:p-6">
        <h2 className="svg-section-heading">Fire safety evidence brief</h2>
        <ScenarioForm onApply={setScenario} submitLabel="Update evidence brief" />
        <p>This brief describes which experimental conditions and research objectives the NASA catalog covers.
          Mission-level fire risk and operating limits are outside its scope.</p>
      </section>
      {!evidence.data ? <RequestStatus {...evidence} /> : coverage.length === 0 ? (
        <p role="status">{trials.length ? 'Select a criterion to build an evidence brief.' : 'No trials are available.'}</p>
      ) : (
        <>
          <section className="svg-subpanel space-y-4 p-4 md:p-6">
            <h2 className="svg-section-heading">Evidence coverage</h2>
            <p><strong>{fullMatches} of {trials.length} trials</strong> match all selected criteria together.</p>
            <p>Counts describe cataloged trials for each criterion across the integrated studies. Each criterion is evaluated separately.</p>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <caption className="sr-only">Scenario evidence coverage by criterion</caption>
                <thead><tr>{['Criterion', 'Match', 'Different', 'Unavailable'].map(label =>
                  <th key={label} scope="col" className="p-2">{label}</th>)}</tr></thead>
                <tbody>{coverage.map(({ label, match, different, missing }) => (
                  <tr key={label}><th scope="row" className="p-2">{label}</th>
                    <td className="p-2">{match}</td><td className="p-2">{different}</td><td className="p-2">{missing}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
            <Link className="resource-link" to="/resources">Browse NASA investigation sources</Link>
          </section>
          <section className="svg-subpanel space-y-3 p-4 md:p-6">
            <h2 className="svg-section-heading">Relevant NASA evidence</h2>
            {candidates.length === 0 ? <p>No integrated trials match any of the selected criteria.</p> : (
              <ul className="grid gap-4 md:grid-cols-2">
                {candidates.map(({ id, best, study }) => (
                  <li className="svg-black-panel space-y-2 p-4" key={id}>
                    <h3 className="svg-section-heading">{study}</h3>
                    <p>Representative trial matches {best.matches} of {best.criteria.length} selected criteria.</p>
                    <ul className="list-disc space-y-1 pl-5">
                      {best.criteria.filter(criterion => criterion.status === 'match').map(criterion =>
                        <li key={criterion.label}><strong>{criterion.label}</strong> · {criterion.evidence}</li>)}
                    </ul>
                    <EvidenceLinks trial={best.trial} source={best.trial.source_url} />
                    {researchContext[id] && <a className="resource-link" href={researchContext[id].reference}>NASA research context</a>}
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="svg-subpanel space-y-3 p-4 md:p-6">
            <h2 className="svg-section-heading">Evidence gaps</h2>
            {gaps.length === 0 ? <p>Each selected criterion has a documented match and complete catalog coverage.</p> : (
              <ul className="list-disc space-y-1 pl-5">
                {gaps.map(({ label, match, missing }) => (
                  <li key={label}><strong>{label}</strong> · {match === 0 ? 'No matching evidence. ' : ''}
                    {missing > 0 && `${missing} of ${trials.length} trials lack a documented value.`}
                  </li>
                ))}
              </ul>
            )}
            <p>These gaps describe the studies integrated into CombusLab.</p>
          </section>
        </>
      )}
    </div>
  )
}
