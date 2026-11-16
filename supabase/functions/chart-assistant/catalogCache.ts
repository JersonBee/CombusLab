import type { createEvidenceReader } from './retrieval.ts'

type Reader = ReturnType<typeof createEvidenceReader>

export function withCatalogCache(read: Reader): Reader {
  return async <T>(endpoint: string, params: Record<string, string>): Promise<T | null> => {
    const key = endpoint === 'catalog' ? catalogKey(params) : undefined
    const origin = Deno.env.get('SUPABASE_URL')
    const secret = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!key || !origin || !secret) return read<T>(endpoint, params)

    async function rpc(operation: 'read' | 'write', body: object) {
      try {
        const response = await fetch(new URL('/rest/v1/rpc/' + operation + '_assistant_catalog_cache', origin), {
          method: 'POST', redirect: 'error', signal: AbortSignal.timeout(700),
          headers: { 'Content-Type': 'application/json', apikey: secret!, Authorization: 'Bearer ' + secret },
          body: JSON.stringify(body),
        })
        if (response.ok && operation === 'read') return await response.json() as unknown
        await response.body?.cancel()
      } catch { /* Cache availability does not control access to the source. */ }
    }

    const cached = await rpc('read', { cache_key: key })
    if (hasRows(cached)) return cached as T
    const fresh = await read<T>(endpoint, params)
    if (hasRows(fresh)) await rpc('write', { cache_key: key, payload: fresh })
    return fresh
  }
}

function catalogKey(params: Record<string, string>) {
  if (Object.keys(params).length === 1 && (params.view === 'inventory' || params.view === 'evidence')) {
    return params.view + '-v1'
  }
  if (Object.keys(params).length === 2 && params.view === 'test-days' && params.investigation_id === 'PSI-21') {
    return 'test-days-psi-21-v1'
  }
}

function hasRows(value: unknown): value is { rows: unknown[] } {
  return Boolean(value && typeof value === 'object' && 'rows' in value && Array.isArray(value.rows))
}
