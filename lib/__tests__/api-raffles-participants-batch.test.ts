import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const { mockFrom, mockRequireAdmin } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockRequireAdmin: vi.fn(),
}))

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: mockFrom } }))
vi.mock('@/lib/require-admin', () => ({ requireAdmin: mockRequireAdmin }))

const RAFFLE_A = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
const RAFFLE_B = 'bbbbbbbb-cccc-dddd-eeee-ffffffffffff'
const P_A = { id: 'p1', raffle_id: RAFFLE_A, name: 'Alice', phone: '+351912345678', registered_at: '2026-01-01T10:00:00Z' }
const P_B = { id: 'p2', raffle_id: RAFFLE_B, name: 'Bob', phone: '+351912345679', registered_at: '2026-01-01T11:00:00Z' }

function makeReq(ids?: string): NextRequest {
  const url = `https://example.com/api/raffles/participants${ids !== undefined ? `?ids=${ids}` : ''}`
  return new NextRequest(url, { headers: { 'x-forwarded-for': '1.2.3.4' } })
}

function makeDbMock(data: unknown[], error: unknown = null) {
  const orderMock = vi.fn().mockResolvedValue({ data, error })
  const inMock = vi.fn().mockReturnValue({ order: orderMock })
  const selectMock = vi.fn().mockReturnValue({ in: inMock })
  return { from: { select: selectMock }, inMock }
}

describe('GET /api/raffles/participants (batch)', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockRequireAdmin.mockResolvedValue(null)
  })

  it('returns 401 when not admin', async () => {
    mockRequireAdmin.mockResolvedValue(Response.json({ error: 'Unauthorized' }, { status: 401 }))
    const { GET } = await import('@/app/api/raffles/participants/route')
    const res = await GET(makeReq(RAFFLE_A))
    expect(res.status).toBe(401)
  })

  it('returns empty object when no ids parameter provided', async () => {
    const { GET } = await import('@/app/api/raffles/participants/route')
    const res = await GET(makeReq())
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({})
  })

  it('returns empty object when all ids are invalid UUIDs', async () => {
    const { GET } = await import('@/app/api/raffles/participants/route')
    const res = await GET(makeReq('not-a-uuid,also-bad'))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({})
  })

  it('returns 400 when more than 20 valid ids are provided', async () => {
    const ids = Array.from({ length: 21 }, (_, i) =>
      `aaaaaaaa-bbbb-cccc-dddd-${String(i).padStart(12, '0')}`,
    ).join(',')
    const { GET } = await import('@/app/api/raffles/participants/route')
    const res = await GET(makeReq(ids))
    expect(res.status).toBe(400)
  })

  it('groups participants by raffle_id in a single DB query', async () => {
    const { from, inMock } = makeDbMock([P_A, P_B])
    mockFrom.mockReturnValue(from)

    const { GET } = await import('@/app/api/raffles/participants/route')
    const res = await GET(makeReq(`${RAFFLE_A},${RAFFLE_B}`))
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body[RAFFLE_A]).toHaveLength(1)
    expect(body[RAFFLE_A][0].name).toBe('Alice')
    expect(body[RAFFLE_B]).toHaveLength(1)
    expect(body[RAFFLE_B][0].name).toBe('Bob')
    expect(inMock).toHaveBeenCalledWith('raffle_id', [RAFFLE_A, RAFFLE_B])
  })

  it('issues exactly one DB query regardless of how many ids are provided', async () => {
    const { from } = makeDbMock([P_A])
    mockFrom.mockReturnValue(from)

    const { GET } = await import('@/app/api/raffles/participants/route')
    await GET(makeReq(`${RAFFLE_A},${RAFFLE_B}`))
    expect(mockFrom).toHaveBeenCalledTimes(1)
  })

  it('silently ignores invalid UUIDs in a mixed list', async () => {
    const { from, inMock } = makeDbMock([P_A])
    mockFrom.mockReturnValue(from)

    const { GET } = await import('@/app/api/raffles/participants/route')
    const res = await GET(makeReq(`${RAFFLE_A},not-a-uuid`))
    expect(res.status).toBe(200)
    expect(inMock).toHaveBeenCalledWith('raffle_id', [RAFFLE_A])
  })

  it('returns 500 on DB error', async () => {
    const { from } = makeDbMock([], { message: 'db fail' })
    mockFrom.mockReturnValue(from)

    const { GET } = await import('@/app/api/raffles/participants/route')
    const res = await GET(makeReq(RAFFLE_A))
    expect(res.status).toBe(500)
  })
})
