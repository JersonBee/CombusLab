import { describe, expect, it } from 'vitest'
import { isSeriesWindowValid, readExportSelection } from '../src/seriesSelection'

describe('Dashboard and Data Lab series windows', () => {
  it.each([['0', '60'], ['5.25', '65.25'], ['2', '2']])(
    'accepts the documented bounds for %s–%s seconds',
    (from_s, to_s) => expect(isSeriesWindowValid({ from_s, to_s })).toBe(true),
  )

  it.each([['', '5'], ['0', ' '], ['-1', '5'], ['2', '1'], ['0', '60.01'], ['0', 'Infinity']])(
    'rejects %s–%s seconds',
    (from_s, to_s) => expect(isSeriesWindowValid({ from_s, to_s })).toBe(false),
  )

  it('preserves the channel and window passed from the Dashboard', () => {
    expect(readExportSelection(new URLSearchParams('channel=co2&from_s=2.5&to_s=5'), ['o2', 'co2']))
      .toEqual({ channel: 'co2', window: { from_s: '2.5', to_s: '5' } })
  })

  it('falls back to the first available channel and default window for invalid links', () => {
    expect(readExportSelection(new URLSearchParams('channel=co2&from_s=0&to_s=61'), ['o2']))
      .toEqual({ channel: 'o2', window: { from_s: '0', to_s: '60' } })
  })

  it('does not select a series channel for a conditions-only trial', () => {
    expect(readExportSelection(new URLSearchParams('channel=o2'), []).channel).toBeUndefined()
  })
})
