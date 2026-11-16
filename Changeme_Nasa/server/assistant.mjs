import { answerChat, emptyReply, parseChatRequest } from './generated/assistant-evidence.mjs'
import { readSnapshot } from './db.mjs'
import { readEvidence, readInventory } from './modules/catalog.mjs'
import { findExperiment, readConditions } from './modules/experiments.mjs'
import { readSeries } from './modules/series.mjs'
import cldFlame from './data/psi-21.json' with { type: 'json' }

const errorReply = emptyReply('ERROR')

function readLocalEvidence(endpoint, params) {
  if (endpoint === 'catalog' && params.view === 'test-days') {
    return params.investigation_id === cldFlame.investigation_id ? cldFlame : null
  }
  return readSnapshot(async db => {
    if (endpoint === 'catalog') {
      if (params.view === 'inventory') return readInventory(db)
      if (params.view === 'evidence') return readEvidence(db)
      return null
    }
    const id = params.experiment_id
    const experiment = await findExperiment(db, id)
    if (!experiment) return null
    if (endpoint === 'experiment') return readConditions(db, experiment, id)
    if (endpoint === 'series') return readSeries(db, experiment, { id, from: Number(params.from_s), to: Number(params.to_s) })
    return null
  })
}

async function askEdge(input) {
  const origin = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  if (!origin) return null
  const key = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY
  try {
    const upstream = await fetch(new URL('/functions/v1/chart-assistant', origin), {
      method: 'POST', redirect: 'error', signal: AbortSignal.timeout(18000),
      headers: { 'Content-Type': 'application/json', ...(key ? { apikey: key } : {}) },
      body: JSON.stringify({ ...input, mode: 'chat' }),
    })
    if (!upstream.ok) {
      await upstream.body?.cancel()
      return null
    }
    const reply = await upstream.json()
    if (['ANSWERED', 'OUT_OF_SCOPE', 'INSUFFICIENT_EVIDENCE'].includes(reply?.status) &&
        typeof reply.answer === 'string' && Array.isArray(reply.evidence) &&
        Array.isArray(reply.citations) && Array.isArray(reply.subjects)) return reply
  } catch {
    // Recover the same structured evidence when the Edge Function is unavailable.
  }
  return null
}

export async function handleAssistant(request, response) {
  const send = (status, body) => {
    response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' })
    response.end(JSON.stringify(body))
  }
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST')
    return send(405, errorReply)
  }

  let input
  try {
    let size = 0
    const chunks = []
    for await (const chunk of request.iterator({ destroyOnReturn: false })) {
      size += chunk.length
      if (size > 8192) {
        request.resume()
        return send(413, errorReply)
      }
      chunks.push(chunk)
    }
    input = parseChatRequest(JSON.parse(Buffer.concat(chunks).toString('utf8')))
  } catch {
    return send(400, errorReply)
  }
  if (!input) return send(400, errorReply)

  const reply = await askEdge(input) ?? await answerChat(input, readLocalEvidence, async () => null)
  return send(reply.status === 'ERROR' ? 503 : 200, reply)
}
