import { useState } from 'react'
import { ArrowUpRight, ExternalLink } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { RequestStatus, useReading } from '../components/ScientificReading'
import { useInventory, type Catalog, type Study } from '../components/StudyInventory'

const formatCount = new Intl.NumberFormat('en')

function StudySource({ study }: { study: Study }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
      <a className="resource-link" href={study.source_url}>
        NASA PSI <ExternalLink size={14} aria-hidden="true" />
      </a>
      <code>{study.investigation_id}</code>
      {study.source_doi && <span>DOI <code>{study.source_doi}</code></span>}
    </div>
  )
}

export function Resources() {
  const inventory = useInventory()
  return (
    <div className="space-y-6">
      <h1 className="svg-page-title text-center">Resources</h1>
      <section className="svg-black-panel p-6 md:p-10 space-y-4">
        <h2 className="svg-section-heading">NASA PSI sources</h2>
        {!inventory.data ? <RequestStatus {...inventory} /> : !inventory.data.rows.length ? <p>No sources available.</p> : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {inventory.data.rows.map(study => (
              <li className="svg-subpanel space-y-2 p-4" key={study.investigation_id}>
                <h3 className="font-semibold">
                  <Link
                    className="resource-link"
                    to={'/resources/' + encodeURIComponent(study.investigation_id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={study.study_name + ' (opens in a new tab)'}
                  >
                    {study.study_name} <ArrowUpRight size={16} aria-hidden="true" />
                  </Link>
                </h3>
                <p>{formatCount.format(study.trials)} catalog trials</p>
                <StudySource study={study} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

export function ResourceDetail() {
  const { investigationId } = useParams()
  const inventory = useInventory()
  const study = inventory.data?.rows.find(row => row.investigation_id === investigationId)

  return (
    <div className="space-y-6">
      <h1 className="svg-page-title resource-title text-center">{study?.study_name ?? 'Research resource'}</h1>
      <section className="svg-black-panel p-6 md:p-10 space-y-5">
        <Link className="resource-link" to="/resources">Back to resources</Link>
        {!inventory.data ? <RequestStatus {...inventory} /> : study ? (
          <Investigation key={study.investigation_id} study={study} />
        ) : <p role="status">Investigation not found.</p>}
      </section>
    </div>
  )
}

function Investigation({ study }: { study: Study }) {
  const [page, setPage] = useState(1)
  const filters = new URLSearchParams({ investigation_id: study.investigation_id, page: String(page) })
  const catalog = useReading<Catalog>('/api/catalog?' + filters)
  const evidence = [
    ['Catalog trials', study.trials],
    ['Trials with quantitative data', study.quantitative_trials],
    ['Trials with series', study.series_trials],
    ['Trials with conditions', study.conditions_trials],
    ['Condition observations', study.observations],
  ] as const

  return (
    <>
      <StudySource study={study} />
      <dl className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {evidence.map(([label, count]) => (
          <div className="svg-subpanel p-4" key={label}>
            <dt>{label}</dt>
            <dd className="text-xl font-semibold tabular-nums">{formatCount.format(count)}</dd>
          </div>
        ))}
      </dl>
      <h2 className="svg-section-heading">Trials</h2>
      {!catalog.data ? <RequestStatus {...catalog} /> : (
        <>
          {catalog.data.rows.length === 0 ? <p>No catalog trials available.</p> : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {catalog.data.rows.map(trial => (
                <li className="svg-subpanel p-4 space-y-1" key={trial.experiment_id}>
                  <Link className="resource-link" to={'/discover?' + new URLSearchParams({
                    investigation_id: study.investigation_id,
                    experiment_id: trial.experiment_id,
                  })}><code>{trial.experiment_id}</code></Link>
                  <p>{trial.material_original ?? 'Material not recorded'}</p>
                  <p>{[trial.has_series && 'Time series', trial.has_conditions && 'Test conditions'].filter(Boolean).join(' · ') || 'Catalog record'}</p>
                </li>
              ))}
            </ul>
          )}
          <nav className="flex flex-wrap items-center gap-3" aria-label="Trial pages">
            <button type="button" className="svg-input px-3 py-1 disabled:opacity-50" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</button>
            <span>Page {page}</span>
            <button type="button" className="svg-input px-3 py-1 disabled:opacity-50" disabled={!catalog.data.has_next} onClick={() => setPage(page + 1)}>Next</button>
          </nav>
        </>
      )}
    </>
  )
}
