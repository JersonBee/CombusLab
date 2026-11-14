import { DynamicBarChart } from '../components/Charts'
import { RequestStatus } from '../components/ScientificReading'
import { StudyLink, useInventory } from '../components/StudyInventory'

export function Ranking() {
  const inventory = useInventory()
  const studies = [...(inventory.data?.rows ?? [])].sort((a, b) =>
    b.quantitative_trials - a.quantitative_trials || a.study_name.localeCompare(b.study_name),
  )

  return (
    <div className="space-y-6">
      <h1 className="svg-page-title text-center">Ranking</h1>
      <section className="svg-black-panel p-6 md:p-10 space-y-5">
        <h2 className="svg-section-heading">Quantitative data coverage</h2>
        <p>Studies are ranked by the number of trials with synchronized measurements or tabular test conditions.</p>
        {!inventory.data ? <RequestStatus {...inventory} /> : !studies.length ? <p>No studies available.</p> : (
          <>
            <DynamicBarChart rows={studies} labelColumn="study_name" valueColumn="quantitative_trials"
              labelTitle="Investigation" valueTitle="Trials with quantitative data" horizontal />
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead><tr>{['Investigation', 'Catalog trials', 'With series', 'With conditions'].map(label => <th className="p-2" scope="col" key={label}>{label}</th>)}</tr></thead>
                <tbody>{studies.map(study => (
                  <tr key={study.investigation_id}><td className="p-2"><StudyLink study={study} /></td>
                    <td className="p-2">{study.trials}</td><td className="p-2">{study.series_trials}</td><td className="p-2">{study.conditions_trials}</td></tr>
                ))}</tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  )
}
