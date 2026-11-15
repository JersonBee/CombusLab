export const defaultSeriesWindow = { from_s: '0', to_s: '60' }

export function isSeriesWindowValid({ from_s, to_s }: typeof defaultSeriesWindow) {
  const start = Number(from_s)
  const duration = Number(to_s) - start
  return Boolean(from_s.trim() && to_s.trim()) &&
    start >= 0 && Number.isFinite(duration) && duration >= 0 && duration <= 60
}

export function readExportSelection<T extends string>(params: URLSearchParams, channels: readonly T[]) {
  const window = { from_s: params.get('from_s') ?? '', to_s: params.get('to_s') ?? '' }
  const channel = channels.find(value => value === params.get('channel')) ?? channels[0]
  return { channel, window: isSeriesWindowValid(window) ? window : defaultSeriesWindow }
}
