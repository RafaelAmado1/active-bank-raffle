import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const { mockRpc } = vi.hoisted(() => ({ mockRpc: vi.fn() }))

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { rpc: mockRpc } }))

const CRON_SECRET = 'test-cron-secret-that-is-32chars!!'

function makeReq(authHeader?: string): NextRequest {
  const headers: Record<string, string> = {}
  if (authHeader !== undefined) headers['authorization'] = authHeader
  return new NextRequest('https://example.com/api/cron/cleanup', { headers })
}

describe('GET /api/cron/cleanup', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    process.env.CRON_SECRET = CRON_SECRET
  })

  it('returns 401 when authorization header is missing', async () => {
    const { GET } = await import('@/app/api/cron/cleanup/route')
    const res = await GET(makeReq())
    expect(res.status).toBe(401)
  })

  it('returns 401 when bearer token is wrong', async () => {
    const { GET } = await import('@/app/api/cron/cleanup/route')
    const res = await GET(makeReq('Bearer wrong-secret'))
    expect(res.status).toBe(401)
  })

  it('returns 401 when header is present but not Bearer scheme', async () => {
    const { GET } = await import('@/app/api/cron/cleanup/route')
    const res = await GET(makeReq(CRON_SECRET))
    expect(res.status).toBe(401)
  })

  it('returns 500 when raffles RPC fails', async () => {
    mockRpc
      .mockResolvedValueOnce({ data: null, error: { message: 'db error' } })
      .mockResolvedValueOnce({ data: 5, error: null })
    const { GET } = await import('@/app/api/cron/cleanup/route')
    const res = await GET(makeReq(`Bearer ${CRON_SECRET}`))
    expect(res.status).toBe(500)
  })

  it('returns 200 with counts when both RPCs succeed', async () => {
    mockRpc
      .mockResolvedValueOnce({ data: 3, error: null })
      .mockResolvedValueOnce({ data: 12, error: null })
    const { GET } = await import('@/app/api/cron/cleanup/route')
    const res = await GET(makeReq(`Bearer ${CRON_SECRET}`))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.deleted_raffles).toBe(3)
    expect(body.deleted_audit).toBe(12)
  })

  it('calls cleanup_old_raffles with 90-day retention', async () => {
    mockRpc.mockResolvedValue({ data: 0, error: null })
    const { GET } = await import('@/app/api/cron/cleanup/route')
    await GET(makeReq(`Bearer ${CRON_SECRET}`))
    expect(mockRpc).toHaveBeenCalledWith('cleanup_old_raffles', { p_retention_days: 90 })
  })

  it('calls cleanup_old_audit_log with 365-day retention', async () => {
    mockRpc.mockResolvedValue({ data: 0, error: null })
    const { GET } = await import('@/app/api/cron/cleanup/route')
    await GET(makeReq(`Bearer ${CRON_SECRET}`))
    expect(mockRpc).toHaveBeenCalledWith('cleanup_old_audit_log', { p_retention_days: 365 })
  })

  it('still returns 200 when audit_log RPC fails (non-fatal)', async () => {
    mockRpc
      .mockResolvedValueOnce({ data: 2, error: null })
      .mockResolvedValueOnce({ data: null, error: { message: 'audit fail' } })
    const { GET } = await import('@/app/api/cron/cleanup/route')
    const res = await GET(makeReq(`Bearer ${CRON_SECRET}`))
    expect(res.status).toBe(200)
  })
})
