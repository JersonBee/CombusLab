import { messages, type ChatReply, type EvidenceCard } from './chatContract.ts'
import type { ChatRequest } from './chatRequest.ts'
import { retrieve, createEvidenceReader } from './retrieval.ts'

type Reader = ReturnType<typeof createEvidenceReader>
type Select = (input: ChatRequest, cards: EvidenceCard[]) => Promise<{ ids: string[]; provider: string } | null>

export function emptyReply(status: ChatReply['status'], detail = ''): ChatReply {
  return { status, answer: [messages[status], detail].filter(Boolean).join(' '),
    citations: [], evidence: [], relatedExperiments: [], relatedDatasets: [], subjects: [] }
}

export function validateSelection(raw: string, cards: EvidenceCard[]) {
  const parsed: unknown = JSON.parse(raw)
  if (!parsed || typeof parsed !== 'object' || !('evidenceIds' in parsed) || !Array.isArray(parsed.evidenceIds) ||
    !parsed.evidenceIds.length || parsed.evidenceIds.length > 5 ||
    !parsed.evidenceIds.every(id => typeof id === 'string' && cards.some(card => card.id === id))) {
    throw new Error('Invalid evidence selection')
  }
  return [...new Set(parsed.evidenceIds as string[])]
}

export async function answerChat(input: ChatRequest, get: Reader, select: Select): Promise<ChatReply> {
  try {
    const { status, cards, subjects, missing } = await retrieve(input, get)
    if (status !== 'ANSWERED') return { ...emptyReply(status, missing), subjects }
    let choice: Awaited<ReturnType<Select>> = null
    try { choice = await select(input, cards) } catch { /* Use the retrieved evidence when a provider is unavailable. */ }
    const order = new Map(choice?.ids.map((id, index) => [id, index]))
    const selected = [...cards].sort((a, b) => (order.get(a.id) ?? 99) - (order.get(b.id) ?? 99))
    // Keep caveats and measured values with any provider-selected explanation.
    const required = cards.filter(card => ['Comparison', 'Missing information', 'Measured data'].includes(card.kind))
    const evidence = [...new Set([...selected.slice(0, 5), ...required])]
    const citations = [...new Map(evidence.flatMap(card => card.citations).map(citation => [citation.id, citation])).values()]
    return { ...emptyReply(status), provider: choice?.provider, evidence, citations, subjects,
      relatedExperiments: [...new Set(citations.flatMap(citation => citation.experimentId ?? []))],
      relatedDatasets: [...new Set(citations.flatMap(citation => citation.datasetId ?? []))] }
  } catch {
    return emptyReply('ERROR')
  }
}
