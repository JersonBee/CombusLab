import { useEffect, useState } from 'react'
import { createClient, FunctionsHttpError, type Session } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
const supabase = url && key ? createClient(url, key) : null

type Channel = 'o2' | 'co2'
type Answer = {
  answer: string | null
  reason?: string
  provider?: string
  evidence?: {
    unit: string; rows: number; missing: number; valid: number
    first: number; last: number; first_time_s: number; last_time_s: number
    min: number; max: number; mean: number; delta_percentage_points: number | null
  }
  sources: Array<{ url: string | null; doi: string | null }>
}

const number = new Intl.NumberFormat('es', { maximumFractionDigits: 5 })

function ChartEvidence({ evidence }: { evidence: NonNullable<Answer['evidence']> }) {
  const format = (value: number) => number.format(value)
  return (
    <div className="space-y-1">
      <p><strong>Lecturas de la ventana</strong></p>
      <p>Primera válida: {format(evidence.first)} {evidence.unit} a los {format(evidence.first_time_s)} s.
        Última válida: {format(evidence.last)} {evidence.unit} a los {format(evidence.last_time_s)} s.</p>
      {evidence.delta_percentage_points !== null &&
        <p>Cambio entre ambas lecturas: {format(evidence.delta_percentage_points)} puntos porcentuales.</p>}
      <p>Rango observado: {format(evidence.min)} a {format(evidence.max)} {evidence.unit}.
        Promedio: {format(evidence.mean)} {evidence.unit}.</p>
      <p>{evidence.valid} lecturas válidas y {evidence.missing} valores ausentes en {evidence.rows} filas.</p>
      {evidence.missing > 0 && <p>Los huecos indican valores ausentes para este canal. La serie no indica su causa.</p>}
    </div>
  )
}

function nasaLink(value: string | null) {
  try {
    const source = new URL(value ?? '')
    return source.protocol === 'https:' && source.hostname === 'psi.nasa.gov' ? source.href : undefined
  } catch {
    return undefined
  }
}

export function ChartAssistant({ id, from, to, channels }: {
  id: string; from: number; to: number; channels: readonly Channel[]
}) {
  const [session, setSession] = useState<Session | null>()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [channel, setChannel] = useState(channels[0])
  const [question, setQuestion] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [turns, setTurns] = useState<Array<{ question: string; channel: Channel; reply: Answer }>>([])
  useEffect(() => {
    if (!supabase) return
    const { data } = supabase.auth.onAuthStateChange((_event, current) => {
      setSession(current)
      if (!current) setTurns([])
    })
    return () => data.subscription.unsubscribe()
  }, [])

  if (!supabase) return <p id="chart-assistant" tabIndex={-1}>Chart assistant is unavailable in this environment.</p>
  const client = supabase
  async function signIn() {
    setBusy(true)
    setNotice('')
    try {
      const { error } = await client.auth.signInWithPassword({ email, password })
      if (error) setNotice('Could not sign in. Check your pilot account credentials.')
    } catch {
      setNotice('Sign-in is temporarily unavailable.')
    } finally {
      setPassword('')
      setBusy(false)
    }
  }
  async function ask() {
    const prompt = question.trim()
    if (!session || !prompt) return
    setBusy(true)
    setNotice('')
    try {
      const { data, error } = await client.functions.invoke<Answer>('chart-assistant', {
        headers: { Authorization: 'Bearer ' + session.access_token },
        body: { experiment_id: id, from_s: from, to_s: to, channel, question: prompt },
      })
      if (error instanceof FunctionsHttpError && error.context.status === 401) {
        setNotice('Your session expired. Sign out and sign in again.')
      } else if (error || !data) {
        setNotice('The assistant is temporarily unavailable.')
      } else {
        setTurns((previous) => [...previous, { question: prompt, channel, reply: data }].slice(-5))
        setQuestion('')
      }
    } catch {
      setNotice('The assistant is temporarily unavailable.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section id="chart-assistant" tabIndex={-1} className="svg-subpanel p-4 space-y-3" aria-label="Chart assistant">
      <h4 className="svg-section-heading">Chart assistant</h4>
      <p>{id} · {from}–{to} s</p>
      {session === undefined ? <p role="status">Checking session…</p> : session === null ? (
        <form className="flex flex-wrap gap-3 items-end" onSubmit={(event) => { event.preventDefault(); void signIn() }}>
          <label className="flex flex-col">Email
            <input className="svg-input p-2" type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
          <label className="flex flex-col">Password
            <input className="svg-input p-2" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} />
          </label>
          <button className="svg-input p-2" disabled={busy}>Sign in</button>
        </form>
      ) : (
        <>
          <button className="underline" type="button" disabled={busy} onClick={async () => {
            const { error } = await client.auth.signOut()
            if (error) setNotice('Could not sign out. Try again.')
            else setNotice('')
          }}>Sign out</button>
          <ul aria-live="polite" className="space-y-3">
            {turns.map(({ question: prompt, channel: selected, reply }, index) => (
              <li key={index} className="border-b border-white/15 pb-3">
                <p><strong>{selected === 'o2' ? 'O₂' : 'CO₂'} · {prompt}</strong></p>
                {reply.evidence && Number.isFinite(reply.evidence.first_time_s) && <ChartEvidence evidence={reply.evidence} />}
                <p className="whitespace-pre-wrap">{reply.answer?.replace(/\*\*([^*\n]+)\*\*/g, '$1') ?? reply.reason ?? 'Insufficient evidence'}</p>
                {reply.provider && <p>AI interpretation · {reply.provider}</p>}
                {reply.sources.map((source, sourceIndex) => {
                  const href = nasaLink(source.url)
                  return <p key={sourceIndex}>{href && <a className="underline" href={href}>NASA PSI evidence</a>}{source.doi && <> · DOI {source.doi}</>}</p>
                })}
              </li>
            ))}
          </ul>
          <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); void ask() }}>
            <label className="flex flex-col">Channel
              <select className="svg-input p-2" disabled={busy} value={channel} onChange={(event) => setChannel(event.target.value as Channel)}>
                {channels.map((item) => <option key={item} value={item}>{item === 'o2' ? 'O₂' : 'CO₂'}</option>)}
              </select>
            </label>
            <label className="flex flex-col">Question
              <textarea className="svg-input p-2" maxLength={1200} required value={question} onChange={(event) => setQuestion(event.target.value)} />
            </label>
            <button className="svg-input p-2" disabled={busy || !question.trim()}>{busy ? 'Generating…' : 'Ask about this chart'}</button>
          </form>
        </>
      )}
      {notice && <p role="alert">{notice}</p>}
    </section>
  )
}
