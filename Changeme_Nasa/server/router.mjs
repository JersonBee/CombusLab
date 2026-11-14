import experiment from '../api/experiment.js'
import series from '../api/series.js'
import catalog from '../api/catalog.js'
import download from '../api/export.js'

const handlers = new Map([
  ['/api/experiment', experiment],
  ['/api/series', series],
  ['/api/catalog', catalog],
  ['/api/export', download],
])

export function handleRequest(request, response) {
  const handler = handlers.get(new URL(request.url, 'http://localhost').pathname)
  if (handler) return handler(request, response)
  response.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' })
  response.end(JSON.stringify({ error: 'Endpoint not found' }))
}
