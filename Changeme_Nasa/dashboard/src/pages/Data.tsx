import { Link } from 'react-router-dom'
import { FlameTitle } from '../components/FlameTitle'
import { RequestStatus } from '../components/ScientificReading'
import { StudyLink, useInventory } from '../components/StudyInventory'

export function Data() {
  const inventory = useInventory()
  return (
    <div className="space-y-6">
      <FlameTitle>Data</FlameTitle>
      <section className="svg-black-panel p-6 md:p-10 space-y-4">
        <h2 className="svg-section-heading">Integrated NASA datasets</h2>
        {!inventory.data ? <RequestStatus {...inventory} /> : !inventory.data.rows.length ? <p>No studies available.</p> : (
          <ul className="grid gap-3 md:grid-cols-2">
            {inventory.data.rows.map(study => (
              <li className="svg-subpanel p-4" key={study.investigation_id}>
                <h3><StudyLink study={study} /></h3>
                <p>{study.trials} catalog trials</p>
                <p>{study.series_trials} trials with synchronized series</p>
                <p>{study.observations} tabular observations</p>
              </li>
            ))}
          </ul>
        )}
        <p>To download a channel or test conditions, select the trials in <Link className="underline" to="/comparations">Comparations</Link>.</p>
      </section>
    </div>
  )
}
