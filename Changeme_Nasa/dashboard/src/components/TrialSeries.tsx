import { useId, useState } from 'react'
import { Link } from 'react-router-dom'
import type { ChartOptions } from 'chart.js'
import { Line } from 'react-chartjs-2'
import { chartColors, chartTooltip } from './Charts'
import { ChartAssistant } from './ChartAssistant'
import { RequestStatus, useReading } from './ScientificReading'
import { defaultSeriesWindow, isSeriesWindowValid } from '../seriesSelection'

const channels = [
  { name: 'o2', label: 'Oxygen (O₂)', color: chartColors.cyan },
  { name: 'co2', label: 'Carbon dioxide (CO₂)', color: chartColors.orbital },
] as const

type Channel = typeof channels[number]['name']
type Series = {
  rows: ({ time_s: number } & Record<Channel, number | null>)[]
  units: { channel: string; unit: string }[]
  source: { url: string | null; doi: string | null }
  truncated: boolean
}

export function TrialSeries({ id, showAssistant = false }: { id: string; showAssistant?: boolean }) {
  const errorId = useId()
  const [draft, setDraft] = useState(defaultSeriesWindow)
  const [interval, setInterval] = useState(draft)
  const [preferredChannel, setPreferredChannel] = useState<Channel>('o2')
  const params = new URLSearchParams({ experiment_id: id, ...interval })
  const series = useReading<Series>('/api/series?' + params)
  const data = series.data
  const available = channels.flatMap(channel => {
    const unit = data?.units.find(item => item.channel === channel.name)?.unit
    return unit && data?.rows.some(row => Number.isFinite(row[channel.name])) ? [{ ...channel, unit }] : []
  })
  const selected = available.find(channel => channel.name === preferredChannel) ?? available[0]
  const invalidInterval = !isSeriesWindowValid(draft)

  return (
    <section className="svg-subpanel min-w-0 space-y-4 p-4 md:p-5" aria-label="Synchronized measurements">
      <h2 className="svg-section-heading">Synchronized measurements</h2>
      <form className="series-window" onSubmit={event => {
        event.preventDefault()
        if (!invalidInterval) setInterval(draft)
      }}>
        <label className="series-window-channel flex flex-col">Channel
          <select className="svg-input p-2" value={selected?.name ?? ''} disabled={!selected}
            onChange={event => setPreferredChannel(event.target.value as Channel)}>
            {!selected && <option value="">No channel available</option>}
            {available.map(channel => <option key={channel.name} value={channel.name}>{channel.label}</option>)}
          </select>
        </label>
        {(['from_s', 'to_s'] as const).map(field => (
          <label key={field} className="flex flex-col">{field === 'from_s' ? 'From (s)' : 'To (s)'}
            <input className="svg-input w-24 p-2" type="number" min="0" step="any" required
              aria-describedby={errorId} value={draft[field]}
              onChange={event => setDraft({ ...draft, [field]: event.target.value })} />
          </label>
        ))}
        <button className="svg-input px-3 py-2" type="submit">Apply time window</button>
      </form>
      <p className="series-window-note" id={errorId} role={invalidInterval ? 'alert' : undefined}>
        {invalidInterval ? 'Use an ascending time window of up to 60 seconds.' : 'Up to 60 seconds per window.'}
      </p>
      {!data ? <RequestStatus {...series} /> : (
        <>
          {selected ? (
            <SeriesChart label={selected.label} unit={selected.unit} color={selected.color}
              points={data.rows.map(row => ({ x: row.time_s, y: row[selected.name] }))} />
          ) : (
            <p role="status">{data.rows.length ? 'No readings with documented units in this window.' : 'No measurements in this window.'}</p>
          )}
          <p>{data.rows.length.toLocaleString('en-US')} synchronized rows · {interval.from_s}–{interval.to_s} s from the first calibrated record.
            {data.truncated && ' The response reached the row limit.'}</p>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {data.source.url && <a className="resource-link" href={data.source.url}>NASA PSI measurement source</a>}
            {data.source.doi && <a className="resource-link" href={'https://doi.org/' + data.source.doi}>Dataset DOI</a>}
            {selected && !data.truncated && <Link className="resource-link" to={'/data-lab?' + new URLSearchParams({
              experiment_id: id, channel: selected.name, ...interval,
            })}>Export in Data Lab</Link>}
          </div>
          {showAssistant && !data.truncated && selected && (
            <ChartAssistant key={params.toString() + selected.name} id={id}
              from={Number(interval.from_s)} to={Number(interval.to_s)} channel={selected.name}
              availableChannels={available.map(channel => channel.name)} onSelectChannel={setPreferredChannel} />
          )}
        </>
      )}
    </section>
  )
}

function SeriesChart({ label, unit, color, points }: {
  label: string; unit: string; color: string; points: { x: number; y: number | null }[]
}) {
  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    parsing: false,
    animation: false,
    plugins: { legend: { display: false }, tooltip: chartTooltip },
    scales: {
      x: { type: 'linear', title: { display: true, text: 'Elapsed time (s)', color: chartColors.text },
        ticks: { color: chartColors.muted }, grid: { color: chartColors.grid } },
      y: { title: { display: true, text: label + ' (' + unit + ')', color: chartColors.text },
        ticks: { color: chartColors.muted }, grid: { color: chartColors.grid } },
    },
  }
  return (
    <div className="h-[320px] min-w-0 md:h-[380px]">
      <Line role="img" aria-label={label + ' concentration over elapsed time'} options={options}
        data={{ datasets: [{ label: label + ' (' + unit + ')', data: points, borderColor: color,
          pointRadius: points.filter(point => point.y !== null).length === 1 ? 4 : 0,
          pointHitRadius: 5, spanGaps: false }] }} />
    </div>
  )
}
