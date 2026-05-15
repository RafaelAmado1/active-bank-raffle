import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockChannel, mockRequireAdmin } = vi.hoisted(() => ({
  mockChannel: vi.fn(),
  mockRequireAdmin: vi.fn(),
}))

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: { channel: mockChannel },
}))
vi.mock('@/lib/require-admin', () => ({ requireAdmin: mockRequireAdmin }))

// ── Helpers ───────────────────────────────────────────────────────────────────

const RAFFLE_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'

function makeReq(body?: unknown): NextRequest {
  return new NextRequest('https://example.com/api/admin/replay', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('POST /api/admin/replay', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockRequireAdmin.mockResolvedValue(null)
    mockChannel.mockReturnValue({ send: vi.fn().mockResolvedValue(undefined) })
  })

  it('returns 401 when not authenticated', async () => {
    mockRequireAdmin.mockResolvedValue(Response.json({ error: 'Unauthorized' }, { status: 401 }))
    const { POST } = await import('@/app/api/admin/replay/route')
    const res = await POST(makeReq({ raffle_id: RAFFLE_ID, label: 'Golo' }))
    expect(res.status).toBe(401)
  })

  it('returns 400 for missing raffle_id', async () => {
    const { POST } = await import('@/app/api/admin/replay/route')
    const res = await POST(makeReq({ label: 'Golo' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 for invalid raffle_id (not a UUID)', async () => {
    const { POST } = await import('@/app/api/admin/replay/route')
    const res = await POST(makeReq({ raffle_id: 'not-a-uuid', label: 'Golo' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 for missing label', async () => {
    const { POST } = await import('@/app/api/admin/replay/route')
    const res = await POST(makeReq({ raffle_id: RAFFLE_ID }))
    expect(res.status).toBe(400)
  })

  it('returns 400 for empty label', async () => {
    const { POST } = await import('@/app/api/admin/replay/route')
    const res = await POST(makeReq({ raffle_id: RAFFLE_ID, label: '' }))
    expect(res.status).toBe(400)
  })

  it('broadcasts replay_winner event and returns 200 ok', async () => {
    const sendMock = vi.fn().mockResolvedValue(undefined)
    mockChannel.mockReturnValue({ send: sendMock })

    const { POST } = await import('@/app/api/admin/replay/route')
    const res = await POST(makeReq({ raffle_id: RAFFLE_ID, label: 'Golo do Benfica' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(mockChannel).toHaveBeenCalledWith('screen')
    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'replay_winner',
        payload: { raffle_id: RAFFLE_ID, label: 'Golo do Benfica' },
      })
    )
  })
})
