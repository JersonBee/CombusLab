import { beforeEach, describe, expect, it, vi } from 'vitest'
import { readSnapshot } from '../../server/db.mjs'
import { reportReadFailure } from '../../server/monitoring.mjs'
import { handleReading } from '../../server/readings.mjs'

vi.mock('../../server/db.mjs', () => ({ readSnapshot: vi.fn() }))
vi.mock('../../server/monitoring.mjs', () => ({ reportReadFailure: vi.fn() }))

async function request(kind, query = '', method = 'GET') {
  const headers = {}
  const response = {
    setHeader: (key, value) => { headers[key] = value },
    writeHead: (status, extra) => { response.status = status; Object.assign(headers, extra) },
    end: (body) => { response.body = body },
  }
  await handleReading(kind, { method, url: '/?' + query }, response)
  return { status: response.status, headers, body: response.body }
}

beforeEach(() => { vi.resetAllMocks() })

describe('scientific API', () => {
  it.each([
    ['catalog', 'page=0'],
    ['catalog', 'flow_min=10&flow_max=2'],
    ['experiment', ''],
    ['series', 'experiment_id=trial&to_s=61'],
    ['export', 'experiment_id=trial&mode=series&channel=unknown&format=csv'],
  ])('rejects invalid %s input before querying', async (kind, query) => {
    expect((await request(kind, query)).status).toBe(400)
    expect(readSnapshot).not.toHaveBeenCalled()
    expect(reportReadFailure).not.toHaveBeenCalled()
  })

  it('rejects writes', async () => {
    const response = await request('catalog', '', 'POST')
    expect(response.status).toBe(405)
    expect(response.headers.Allow).toBe('GET')
  })

  it('returns 404 for an unknown experiment', async () => {
    readSnapshot.mockImplementation((operation) => operation({ query: async () => ({ rows: [] }) }))
    expect((await request('experiment', 'experiment_id=unknown')).status).toBe(404)
  })

  it('paginates catalog results without exposing the lookahead row', async () => {
    const query = vi.fn().mockResolvedValue({ rows: Array.from({ length: 21 }, (_, id) => ({ id })) })
    readSnapshot.mockImplementation((operation) => operation({ query }))
    const response = await request('catalog', 'page=2&investigation_id=PSI-25')
    expect(response.status).toBe(200)
    expect(JSON.parse(response.body)).toMatchObject({ page: 2, has_next: true })
    expect(JSON.parse(response.body).rows).toHaveLength(20)
    expect(query.mock.calls[0][1]).toEqual([expect.any(Array), 'PSI-25', '', null, null, 21, 20])
  })

  it('preserves a missing channel value and source row in CSV', async () => {
    const query = vi.fn()
      .mockResolvedValueOnce({ rows: [{ investigation_id: 'PSI-100', source_test_id: 'S1' }] })
      .mockResolvedValueOnce({ rows: [{ channel: 'o2', unit: '%' }] })
      .mockResolvedValueOnce({ rows: [{ epoch_ms: '10', time_s: 0, o2: null, co2: 5, saffire_source_row: '8' }] })
    readSnapshot.mockImplementation((operation) => operation({ query }))
    const response = await request('export', 'experiment_id=trial&mode=series&channel=o2&format=csv')
    expect(response.status).toBe(200)
    expect(response.headers['Content-Disposition']).toBe('attachment; filename="trial-o2.csv"')
    expect(response.body).toContain('"10","0","o2",,"%",,"8"\r\n')
  })

  it('returns synchronized readings with their units, source and time reference', async () => {
    const source_url = 'https://psi.nasa.gov/physci/repo/data/investigations/PSI-100'
    const rows = [{ epoch_ms: '1000', time_s: 2.5, o2: null, co2: 0.04 }]
    const units = [{ channel: 'co2', unit: '%' }]
    const query = vi.fn()
      .mockResolvedValueOnce({ rows: [{ investigation_id: 'PSI-100', source_test_id: 'S1', source_url }] })
      .mockResolvedValueOnce({ rows: units })
      .mockResolvedValueOnce({ rows })
    readSnapshot.mockImplementation(operation => operation({ query }))

    const response = await request('series', 'experiment_id=PSI-100%3AS1%3Ar2&from_s=2&to_s=5')

    expect(response.status).toBe(200)
    expect(JSON.parse(response.body)).toMatchObject({
      experiment_id: 'PSI-100:S1:r2', from_s: 2, to_s: 5, units, rows,
      source: { url: source_url }, time_unit: 's', time_reference: 'first_calibrated_record', truncated: false,
    })
    expect(query.mock.calls[2][1]).toEqual(['PSI-100:S1:r2', 2, 5, 5001])
  })

  it('preserves BASS-II conditions and qualifiers for Discover', async () => {
    const experiment = { investigation_id: 'PSI-25', study_name: 'BASS-II', saffire_filas: 0, cygnus_filas: 0 }
    const conditions = [{ field: 'oxygen', value: null, upper_bound: 21, unit: '%', qualifier: '<' }]
    const query = vi.fn()
      .mockResolvedValueOnce({ rows: [experiment] })
      .mockResolvedValueOnce({ rows: conditions })
    readSnapshot.mockImplementation(operation => operation({ query }))

    const response = await request('experiment', 'experiment_id=PSI-25%3AB10%3Ar11')

    expect(response.status).toBe(200)
    expect(JSON.parse(response.body)).toMatchObject({ experiment, conditions })
  })

  it('reports server errors and returns a generic 503', async () => {
    const error = Object.assign(new Error('private connection detail'), { code: 'ECONNRESET' })
    readSnapshot.mockRejectedValue(error)
    const response = await request('catalog')
    expect(reportReadFailure).toHaveBeenCalledWith(error, 'catalog')
    expect(response.status).toBe(503)
    expect(response.body).not.toContain('private connection detail')
  })
})
