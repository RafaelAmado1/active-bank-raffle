import { GET } from './route'

describe('GET /api/health', () => {
  it('returns 200', async () => {
    const res = await GET()
    expect(res.status).toBe(200)
  })

  it('returns status ok', async () => {
    const res = await GET()
    const body = await res.json()
    expect(body.status).toBe('ok')
  })

  it('returns a ts ISO string', async () => {
    const res = await GET()
    const body = await res.json()
    expect(new Date(body.ts).toISOString()).toBe(body.ts)
  })

  it('sets Cache-Control: no-store', async () => {
    const res = await GET()
    expect(res.headers.get('Cache-Control')).toBe('no-store')
  })
})
