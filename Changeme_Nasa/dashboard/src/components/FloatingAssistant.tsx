import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Minus, Send, Trash2 } from 'lucide-react'
import assistantIcon from '../assets/pixil-frame-0.svg'
import { AssistantContext } from '../assistantContext'
import { hasSafeSource, messages, type ChatContext, type ChatReply } from '../../../../supabase/functions/chart-assistant/chatContract'

type Turn = { question: string; reply: ChatReply }

const starterQuestions = [
  'Which investigations study flame spread?',
  'What datasets are available for flame spread?',
  'Explain this chart.',
  'What variables could help model flammability?',
]

const failure: ChatReply = {
  status: 'ERROR', answer: messages.ERROR, evidence: [], citations: [], subjects: [],
  relatedExperiments: [], relatedDatasets: [],
}

export function AssistantProvider({ children }: { children: ReactNode }) {
  const { pathname, search, key } = useLocation()
  const [fragments, setFragments] = useState<Record<string, { location: string; values: ChatContext }>>({})
  const registration = useMemo(() => ({
    register(id: string, location: string, values: ChatContext) {
      setFragments(previous => ({ ...previous, [id]: { location, values } }))
      return () => setFragments(previous => {
        const { [id]: _removed, ...remaining } = previous
        return remaining
      })
    },
  }), [])
  const params = new URLSearchParams(search)
  const experimentId = params.get('experiment_id') ?? undefined
  const context: ChatContext = {
    currentPage: pathname,
    investigationId: pathname.match(/^\/resources\/(PSI-\d+)$/)?.[1] ?? params.get('investigation_id') ?? undefined,
    experimentId,
    datasetId: pathname === '/data-lab' ? experimentId : undefined,
    selectedExperiments: [params.get('a'), params.get('b')].filter((id): id is string => Boolean(id)),
    ...Object.assign({}, ...Object.values(fragments).filter(item => item.location === key).map(item => item.values)),
  }
  return <AssistantContext.Provider value={registration}>
    {children}
    <FloatingAssistant context={context} />
  </AssistantContext.Provider>
}

function FloatingAssistant({ context }: { context: ChatContext }) {
  const [view, setView] = useState<'closed' | 'minimized' | 'open'>('closed')
  const [draft, setDraft] = useState('')
  const [pending, setPending] = useState('')
  const [turns, setTurns] = useState<Turn[]>([])
  const launcher = useRef<HTMLButtonElement>(null)
  const composer = useRef<HTMLTextAreaElement>(null)
  const history = useRef<HTMLDivElement>(null)
  const inFlight = useRef<AbortController | null>(null)
  const open = view === 'open'

  useEffect(() => {
    if (open) composer.current?.focus({ preventScroll: true })
  }, [open])

  useEffect(() => {
    if (open && history.current) history.current.scrollTop = history.current.scrollHeight
  }, [open, pending, turns])

  function hide(next: 'closed' | 'minimized') {
    if (next === 'closed') {
      const request = inFlight.current
      inFlight.current = null
      request?.abort()
      setDraft('')
      setPending('')
      setTurns([])
    }
    setView(next)
    launcher.current?.focus({ preventScroll: true })
  }

  async function send(input: string) {
    const question = input.trim()
    if (!question || inFlight.current) return
    const request = new AbortController()
    inFlight.current = request
    setDraft('')
    setPending(question)
    let reply = failure
    try {
      const response = await fetch('/api/assistant/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: question, context,
          conversationHistory: turns.filter(turn => turn.reply.status === 'ANSWERED' && turn.reply.subjects.length).slice(-4).map(turn =>
            ({ question: turn.question.slice(0, 300), subjects: turn.reply.subjects })),
        }),
        signal: AbortSignal.any([request.signal, AbortSignal.timeout(30000)]),
      })
      if (response.ok) {
        const data: ChatReply = await response.json()
        if (data && Object.hasOwn(messages, data.status) && typeof data.answer === 'string' &&
            Array.isArray(data.evidence) && Array.isArray(data.citations) && Array.isArray(data.subjects)) reply = data
      }
    } catch {
      // Request errors share one user-facing state.
    } finally {
      if (inFlight.current === request) {
        inFlight.current = null
        setTurns(previous => [...previous, { question, reply }].slice(-30))
        setPending('')
      }
    }
  }

  return <>
    <button ref={launcher} type="button" className="assistant-launcher"
      aria-label={open ? 'Minimize assistant' : view === 'minimized' ? 'Restore assistant' : 'Open assistant'}
      aria-expanded={open} aria-controls="assistant-chat" onClick={() => open ? hide('minimized') : setView('open')}>
      <span className="assistant-orbit" aria-hidden="true" />
      <img src={assistantIcon} alt="" width={80} height={80} />
    </button>
    <section className="assistant-chat" id="assistant-chat" role="dialog" aria-labelledby="assistant-title"
      inert={!open} aria-hidden={!open} data-open={open}
      onKeyDown={event => {
        if (event.key === 'Escape') {
          event.stopPropagation()
          hide('minimized')
        }
      }}>
      <header className="assistant-chat-header">
        <h2 id="assistant-title" className="svg-section-heading">Flame in Freefall Assistant</h2>
        <button type="button" className="svg-input" aria-label="Minimize chat" onClick={() => hide('minimized')}>
          <Minus size={16} aria-hidden="true" />
        </button>
        <button type="button" className="svg-input" aria-label="Clear conversation and close chat" title="Clear conversation and close chat" onClick={() => hide('closed')}>
          <Trash2 size={17} aria-hidden="true" />
        </button>
      </header>
      <div className="assistant-chat-history" role="log" aria-label="Conversation" ref={history} tabIndex={0}>
        <div className="assistant-chat-answer">
          Hi! I am the Flame in Freefall assistant. Ask me about the investigations, experiments, datasets or charts in CombusLab.
          I can compare the available evidence and point you to the NASA sources.
        </div>
        {turns.length === 0 && !pending && <div className="flex flex-wrap gap-2">
          {starterQuestions.map(question => <button key={question} className="svg-input px-2 py-1" type="button"
            onClick={() => void send(question)}>{question}</button>)}
        </div>}
        {turns.map(({ question, reply }, index) => <article key={index} className="assistant-chat-turn">
          <p className="assistant-chat-question"><span className="sr-only">You: </span>{question}</p>
          <Answer reply={reply} onOpenLink={() => setView('minimized')} />
        </article>)}
        {pending && <div className="assistant-chat-turn">
          <p className="assistant-chat-question">{pending}</p>
          <p className="assistant-chat-answer" role="status">Analyzing…</p>
        </div>}
      </div>
      <form className="assistant-chat-compose" onSubmit={event => { event.preventDefault(); void send(draft) }}>
        <label htmlFor="assistant-question" className="sr-only">Ask the assistant</label>
        <textarea ref={composer} id="assistant-question" className="svg-input p-2" rows={2} maxLength={1200}
          placeholder="Ask about the evidence…" value={draft} onChange={event => setDraft(event.target.value)}
          onKeyDown={event => {
            if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault()
              void send(draft)
            }
          }} />
        <button type="submit" className="svg-input px-3" aria-label="Send question" disabled={!draft.trim() || !!pending}>
          <Send size={17} aria-hidden="true" />
        </button>
      </form>
    </section>
  </>
}

function Answer({ reply, onOpenLink }: { reply: ChatReply; onOpenLink: () => void }) {
  const citations = reply.citations.filter(item => hasSafeSource(item.url))
  const indices = new Map(citations.map((source, index) => [source.id, index + 1]))
  return <div className="assistant-chat-answer space-y-3" data-status={reply.status}>
    <p role={reply.status === 'ERROR' ? 'alert' : undefined}>{reply.answer}</p>
    {reply.evidence.map(card => <p key={card.id}>
      <strong className="block">{card.kind}</strong>{card.text}
      {' '}{[...new Set(card.citations.flatMap(item => indices.get(item.id) ?? []))].map(index => (
        <sup key={index} className="mr-1 text-cyan" aria-label={'Source ' + index}>[{index}]</sup>
      ))}
    </p>)}
    {citations.length > 0 && <div>
      <h3 className="font-semibold">NASA sources</h3>
      <ol className="list-decimal space-y-2 pl-5">
        {citations.map(item => <li key={item.id}>
          <a className="resource-link" href={item.url} target="_blank" rel="noreferrer">{item.title}</a>
          {item.experimentId && <span className="block text-xs">{item.experimentId}</span>}
          {item.href && /^\/(discover|resources|data-lab|flight-notebook)(?:[/?]|$)/.test(item.href) &&
            <Link className="resource-link text-xs" to={item.href} onClick={onOpenLink}>View in CombusLab</Link>}
        </li>)}
      </ol>
    </div>}
  </div>
}
