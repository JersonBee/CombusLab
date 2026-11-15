export async function reserveAssistantRequest(): Promise<'granted' | 'limit' | 'unavailable'> {
  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) return 'unavailable'
  try {
    const response = await fetch(new URL('/rest/v1/rpc/reserve_chart_assistant_request', url), {
      method: 'POST',
      headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: '{}',
      signal: AbortSignal.timeout(2500),
    })
    if (!response.ok) return 'unavailable'
    const granted: unknown = await response.json()
    return granted === true ? 'granted' : granted === false ? 'limit' : 'unavailable'
  } catch {
    return 'unavailable'
  }
}
