import { useState } from 'react'
import { Link } from 'react-router-dom'
import { cldFlame, rankCldFlame } from '../cldFlame'
import { statusLabels, type Scenario } from '../scientificEvidence'
import { DynamicBarChart } from './Charts'
import { RequestStatus, useReading } from './ScientificReading'

type TestDayTable = {
  source: { url: string; filename: string; file_version: number }
  rows: { date: string; test_type: string; flames_ignited: number }[]
}

export function CldFlameLink() {
  return <Link className="resource-link" to={cldFlame.path}>{cldFlame.name}</Link>
}

export function CldFlameRelevance({ scenario }: { scenario: Scenario }) {
  const { criteria, matches, score } = rankCldFlame(scenario)
  if (!matches) return null
  return (
    <section className="svg-subpanel space-y-3 p-4">
      <h2 className="svg-section-heading">Investigation-level relevance</h2>
      <CldFlameLink />
      <p>{score}% relevance · {matches} of {criteria.length} criteria match at investigation level.</p>
      <ul className="list-disc space-y-1 pl-5">
        {criteria.map(({ label, status, evidence }) =>
          <li key={label}><strong>{label}</strong> · {statusLabels[status]} · {evidence}</li>)}
      </ul>
      <p>CLD Flame contributes daily counts. Trial coverage totals count only the integrated SAFFIRE and BASS trials.</p>
      <a className="resource-link" href={cldFlame.nasa}>NASA research objective</a>
    </section>
  )
}

export function CldFlameEvidence() {
  const reading = useReading<TestDayTable>(cldFlame.endpoint)
  const [testType, setTestType] = useState('')
  const table = reading.data
  return (
    <section className="svg-black-panel space-y-4 p-4 md:p-8" aria-label="ACME CLD Flame">
      <h2 className="svg-section-heading">{cldFlame.name}</h2>
      <p>{cldFlame.overview} <a className="resource-link" href={cldFlame.nasa}>NASA study overview</a></p>
      {!table ? <RequestStatus {...reading} /> : <TestDays table={table} testType={testType} onTestType={setTestType} />}
    </section>
  )
}

function TestDays({ table, testType, onTestType }: {
  table: TestDayTable; testType: string; onTestType: (testType: string) => void
}) {
  const testTypes = [...new Set(table.rows.map(row => row.test_type))]
  const rows = table.rows.filter(row => !testType || row.test_type === testType)
  return (
    <>
      <h3 className="svg-section-heading">Flames ignited by test day</h3>
      <label className="flex w-fit max-w-full flex-col">Test type
        <select className="svg-input max-w-full p-2" value={testType} onChange={event => onTestType(event.target.value)}>
          <option value="">All test types</option>
          {testTypes.map(type => <option key={type}>{type}</option>)}
        </select>
      </label>
      <p role="status">{rows.length} of {table.rows.length} test days · {rows.reduce((sum, row) => sum + row.flames_ignited, 0)} flames ignited</p>
      <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Scrollable test day chart">
        <div style={{ minWidth: Math.max(300, rows.length * 27) }}>
          <DynamicBarChart rows={rows} labelColumn="date" valueColumn="flames_ignited" maxBars={rows.length}
            labelTitle="Test day" valueTitle="Flames ignited" />
        </div>
      </div>
      <p>Each bar is a reported count for one test day. The date axis lists observed test days. The source does not give the number of attempts needed to calculate an ignition rate.</p>
      <details>
        <summary className="cursor-pointer">View daily counts</summary>
        <table className="w-full text-left">
          <caption className="sr-only">Reported flames ignited by test day</caption>
          <thead><tr>{['Test day', 'Test type', 'Flames ignited'].map(label =>
            <th key={label} scope="col" className="p-2">{label}</th>)}</tr></thead>
          <tbody>{rows.map(row => <tr key={row.date}>
            <th scope="row" className="p-2">{row.date}</th>
            <td className="p-2">{row.test_type}</td><td className="p-2 tabular-nums">{row.flames_ignited}</td>
          </tr>)}</tbody>
        </table>
      </details>
      <p><a className="resource-link" href={table.source.url}>NASA PSI source</a> · {table.source.filename} · File version {table.source.file_version}</p>
    </>
  )
}
