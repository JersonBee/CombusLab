import { FlameTitle } from '../components/FlameTitle'
import { RequestStatus } from '../components/ScientificReading'
import { StudyLink, useInventory } from '../components/StudyInventory'

export function Resources() {
  const inventory = useInventory()
  return (
    <div className="space-y-6">
      <FlameTitle>Resources</FlameTitle>
      <section className="svg-black-panel p-6 md:p-10 space-y-4">
        <h2 className="svg-section-heading">NASA PSI sources</h2>
        {!inventory.data ? <RequestStatus {...inventory} /> : !inventory.data.rows.length ? <p>No sources available.</p> : (
          <ul className="space-y-3">
            {inventory.data.rows.map(study => (
              <li className="svg-subpanel p-4" key={study.investigation_id}>
                <h3><StudyLink study={study} /></h3>
                <a className="underline" href={study.source_url}>NASA PSI · {study.investigation_id}</a>
                {study.source_doi && <p>DOI {study.source_doi}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
