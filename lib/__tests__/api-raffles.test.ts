import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const { mockFrom, mockRequireAdmin, mockAudit } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockRequireAdmin: vi.fn(),
  mockAudit: vi.fn(),
}))

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: mockFrom } }))
vi.mock('@/lib/require-admin', () => ({ requireAdmin: mockRequireAdmin }))
vi.mock('@/lib/audit', () => ({ audit: mockAudit }))

const RAFFLE_A = { id: 'aaaa-0000', label: 'Golo', status: 'active', duration_sec: 120, starts_at: '2026-01-01', ends_at: null, winner_id: null, created_at: '2026-01-01' }
const RAFFLE_B = { id: 'bbbb-0000', label: 'Final', status: 'closed', duration_sec: 300, starts_at: '2026-01-01', ends_at: '2026-01-01', winner_id: 'winner-id', created_at: '2026-01-01' }

function makeGetReq(): NextRequest {
  return new NextRequest('https://example.com/api/raffles')
}
function makePostReq(body: unknown): NextRequest {
  return new NextRequest('https://example.com/api/raffles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '1.2.3.4' },
    body: JSON.stringify(body),
  })
}

// ── GET /api/raffles ──────────────────────────────────────────────────────────

describe('GET /api/raffles', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockAudit.mockImplementation(() => {})
  })

  it('returns 500 on DB error', async () => {
    mockFrom.mockReturnValue({ select: vi.fn().mockReturnValue({ order: vi.fn().mockResolvedValue({ data: null, error: { message: 'db fail' } }) }) })
    const { GET } = await import('@/app/api/raffles/route')
    const res = await GET(makeGetReq())
    expect(res.status).toBe(500)
  })

  it('includes winner_id in responses so the screen can detect new winners', async () => {
    mockFrom.mockReturnValue({ select: vi.fn().mockReturnValue({ order: vi.fn().mockResolvedValue({ data: [RAFFLE_A, RAFFLE_B], error: null }) }) })
    const { GET } = await import('@/app/api/raffles/route')
    const res = await GET(makeGetReq())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveLength(2)
    body.forEach((r: Record<string, unknown>) => expect(r).toHaveProperty('winner_id'))
  })

  it('returns empty array when no raffles', async () => {
    mockFrom.mockReturnValue({ select: vi.fn().mockReturnValue({ order: vi.fn().mockResolvedValue({ data: [], error: null }) }) })
    const { GET } = await import('@/app/api/raffles/route')
    const res = await GET(makeGetReq())
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual([])
  })
})

// ── POST /api/raffles ─────────────────────────────────────────────────────────

describe('POST /api/raffles', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockRequireAdmin.mockResolvedValue(null)
    mockAudit.mockImplementation(() => {})
  })

  it('returns 401 when not admin', async () => {
    mockRequireAdmin.mockResolvedValue(Response.json({ error: 'Unauthorized' }, { status: 401 }))
    const { POST } = await import('@/app/api/raffles/route')
    const res = await POST(makePostReq({ label: 'Golo', duration_sec: 120 }))
    expect(res.status).toBe(401)
  })

  it('returns 400 when label is missing', async () => {
    const { POST } = await import('@/app/api/raffles/route')
    const res = await POST(makePostReq({ duration_sec: 120 }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when duration_sec is out of range', async () => {
    const { POST } = await import('@/app/api/raffles/route')
    const res = await POST(makePostReq({ label: 'Golo', duration_sec: 5 }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when body is not JSON', async () => {
    const { POST } = await import('@/app/api/raffles/route')
    const req = new NextRequest('https://example.com/api/raffles', { method: 'POST', body: '{{bad' })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 201 and audits on valid creation', async () => {
    const newRaffle = { ...RAFFLE_A, id: 'new-id', label: 'Golo', duration_sec: 120 }
    const single = vi.fn().mockResolvedValue({ data: newRaffle, error: null })
    const select = vi.fn().mockReturnValue({ single })
    const insert = vi.fn().mockReturnValue({ select })
    mockFrom.mockReturnValue({ insert })

    const { POST } = await import('@/app/api/raffles/route')
    const res = await POST(makePostReq({ label: 'Golo', duration_sec: 120 }))
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.label).toBe('Golo')
    expect(mockAudit).toHaveBeenCalledWith(expect.objectContaining({ event: 'raffle.created' }))
  })

  it('trims label whitespace', async () => {
    const newRaffle = { ...RAFFLE_A, id: 'new-id', label: 'Golo', duration_sec: 120 }
    const single = vi.fn().mockResolvedValue({ data: newRaffle, error: null })
    const select = vi.fn().mockReturnValue({ single })
    const insert = vi.fn().mockReturnValue({ select })
    mockFrom.mockReturnValue({ insert })

    const { POST } = await import('@/app/api/raffles/route')
    await POST(makePostReq({ label: '  Golo  ', duration_sec: 120 }))
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ label: 'Golo' }))
  })

  it('returns 500 on DB error', async () => {
    const single = vi.fn().mockResolvedValue({ data: null, error: { message: 'db fail' } })
    const select = vi.fn().mockReturnValue({ single })
    const insert = vi.fn().mockReturnValue({ select })
    mockFrom.mockReturnValue({ insert })

    const { POST } = await import('@/app/api/raffles/route')
    const res = await POST(makePostReq({ label: 'Golo', duration_sec: 120 }))
    expect(res.status).toBe(500)
  })
})
