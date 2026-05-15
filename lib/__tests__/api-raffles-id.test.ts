import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockFrom, mockIsAdmin, mockRequireAdmin, mockAudit } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockIsAdmin: vi.fn(),
  mockRequireAdmin: vi.fn(),
  mockAudit: vi.fn(),
}))

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: mockFrom } }))
vi.mock('@/lib/admin-auth', () => ({ isAdminAuthenticated: mockIsAdmin }))
vi.mock('@/lib/require-admin', () => ({ requireAdmin: mockRequireAdmin }))
vi.mock('@/lib/audit', () => ({ audit: mockAudit }))

// ── Helpers ───────────────────────────────────────────────────────────────────

const RAFFLE_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
const WINNER_ID = 'cccccccc-dddd-eeee-ffff-aaaaaaaaaaaa'

function makeReq(method: string, body?: unknown): NextRequest {
  return new NextRequest(`https://example.com/api/raffles/${RAFFLE_ID}`, {
    method,
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '1.2.3.4' },
    body: body ? JSON.stringify(body) : undefined,
  })
}

function makeParams(id = RAFFLE_ID) {
  return { params: Promise.resolve({ id }) }
}

// ── Tests: GET ────────────────────────────────────────────────────────────────

describe('GET /api/raffles/[id]', () => {
  const baseRaffle = {
    id: RAFFLE_ID,
    label: 'Golo',
    status: 'closed',
    duration_sec: 120,
    starts_at: '2026-01-01T00:00:00Z',
    ends_at: '2026-01-01T00:02:00Z',
    winner_id: null,
    created_at: '2026-01-01T00:00:00Z',
  }

  beforeEach(() => {
    vi.resetAllMocks()
    mockIsAdmin.mockResolvedValue(false)
    mockAudit.mockImplementation(() => {})
  })

  it('returns 400 for invalid UUID', async () => {
    const { GET } = await import('@/app/api/raffles/[id]/route')
    const res = await GET(makeReq('GET'), { params: Promise.resolve({ id: 'bad-uuid' }) })
    expect(res.status).toBe(400)
  })

  it('returns 404 when raffle not found', async () => {
    const single = vi.fn().mockResolvedValue({ data: null, error: { message: 'not found' } })
    const eq = vi.fn().mockReturnValue({ single })
    const select = vi.fn().mockReturnValue({ eq })
    mockFrom.mockReturnValue({ select })

    const { GET } = await import('@/app/api/raffles/[id]/route')
    const res = await GET(makeReq('GET'), makeParams())
    expect(res.status).toBe(404)
  })

  it('returns raffle without winner data when winner_id is null', async () => {
    const single = vi.fn().mockResolvedValue({ data: baseRaffle, error: null })
    const eq = vi.fn().mockReturnValue({ single })
    const select = vi.fn().mockReturnValue({ eq })
    mockFrom.mockReturnValue({ select })

    const { GET } = await import('@/app/api/raffles/[id]/route')
    const res = await GET(makeReq('GET'), makeParams())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.id).toBe(RAFFLE_ID)
    expect(body.raffle_participants).toBeNull()
  })

  it('returns masked phone for non-admin when raffle has winner', async () => {
    const raffleWithWinner = { ...baseRaffle, winner_id: WINNER_ID }
    const raffleSingle = vi.fn().mockResolvedValue({ data: raffleWithWinner, error: null })
    const raffleEq = vi.fn().mockReturnValue({ single: raffleSingle })
    const raffleSelect = vi.fn().mockReturnValue({ eq: raffleEq })

    const participantSingle = vi.fn().mockResolvedValue({ data: { name: 'Alice', phone: '+351912345678' }, error: null })
    const participantEq = vi.fn().mockReturnValue({ single: participantSingle })
    const participantSelect = vi.fn().mockReturnValue({ eq: participantEq })

    mockFrom
      .mockReturnValueOnce({ select: raffleSelect })
      .mockReturnValueOnce({ select: participantSelect })

    const { GET } = await import('@/app/api/raffles/[id]/route')
    const res = await GET(makeReq('GET'), makeParams())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.raffle_participants.name).toBe('Alice')
    expect(body.raffle_participants.phone).toMatch(/^[+*]+\d{4}$/)
    expect(body.raffle_participants.phone).not.toBe('+351912345678')
  })

  it('returns full phone for admin when raffle has winner', async () => {
    mockIsAdmin.mockResolvedValue(true)
    const raffleWithWinner = { ...baseRaffle, winner_id: WINNER_ID }
    const raffleSingle = vi.fn().mockResolvedValue({ data: raffleWithWinner, error: null })
    const raffleEq = vi.fn().mockReturnValue({ single: raffleSingle })
    const raffleSelect = vi.fn().mockReturnValue({ eq: raffleEq })

    const participantSingle = vi.fn().mockResolvedValue({ data: { name: 'Alice', phone: '+351912345678' }, error: null })
    const participantEq = vi.fn().mockReturnValue({ single: participantSingle })
    const participantSelect = vi.fn().mockReturnValue({ eq: participantEq })

    mockFrom
      .mockReturnValueOnce({ select: raffleSelect })
      .mockReturnValueOnce({ select: participantSelect })

    const { GET } = await import('@/app/api/raffles/[id]/route')
    const res = await GET(makeReq('GET'), makeParams())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.raffle_participants.phone).toBe('+351912345678')
  })
})

// ── Tests: PATCH close ────────────────────────────────────────────────────────

describe('PATCH /api/raffles/[id] — close', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockRequireAdmin.mockResolvedValue(null)
    mockAudit.mockImplementation(() => {})
  })

  it('returns 401 when not authenticated', async () => {
    mockRequireAdmin.mockResolvedValue(Response.json({ error: 'Unauthorized' }, { status: 401 }))
    const { PATCH } = await import('@/app/api/raffles/[id]/route')
    const res = await PATCH(makeReq('PATCH', { action: 'close' }), makeParams())
    expect(res.status).toBe(401)
  })

  it('returns 400 for invalid UUID', async () => {
    const { PATCH } = await import('@/app/api/raffles/[id]/route')
    const res = await PATCH(makeReq('PATCH', { action: 'close' }), { params: Promise.resolve({ id: 'bad' }) })
    expect(res.status).toBe(400)
  })

  it('returns 400 for invalid action', async () => {
    const { PATCH } = await import('@/app/api/raffles/[id]/route')
    const res = await PATCH(makeReq('PATCH', { action: 'invalid' }), makeParams())
    expect(res.status).toBe(400)
  })

  it('closes raffle and emits audit event', async () => {
    const raffleData = { id: RAFFLE_ID, label: 'Golo', status: 'closed', duration_sec: 120, starts_at: '2026-01-01', ends_at: '2026-01-01', winner_id: null, created_at: '2026-01-01' }
    const selectSingle = vi.fn().mockResolvedValue({ data: raffleData, error: null })
    const selectMock = vi.fn().mockReturnValue({ single: selectSingle })
    const eqMock = vi.fn().mockReturnValue({ select: selectMock })
    const updateMock = vi.fn().mockReturnValue({ eq: eqMock })
    mockFrom.mockReturnValue({ update: updateMock })

    const { PATCH } = await import('@/app/api/raffles/[id]/route')
    const res = await PATCH(makeReq('PATCH', { action: 'close' }), makeParams())
    expect(res.status).toBe(200)
    expect(mockAudit).toHaveBeenCalledWith(expect.objectContaining({ event: 'raffle.closed' }))
  })
})

// ── Tests: PATCH draw ─────────────────────────────────────────────────────────

describe('PATCH /api/raffles/[id] — draw', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockRequireAdmin.mockResolvedValue(null)
    mockAudit.mockImplementation(() => {})
  })

  function makeRaffleQueryMock(data: unknown) {
    const single = vi.fn().mockResolvedValue({ data, error: null })
    const eq = vi.fn().mockReturnValue({ single })
    const select = vi.fn().mockReturnValue({ eq })
    return { select }
  }

  it('returns 400 when raffle is still active', async () => {
    mockFrom.mockReturnValue(makeRaffleQueryMock({ id: RAFFLE_ID, status: 'active', winner_id: null }))
    const { PATCH } = await import('@/app/api/raffles/[id]/route')
    const res = await PATCH(makeReq('PATCH', { action: 'draw' }), makeParams())
    expect(res.status).toBe(400)
  })

  it('returns 409 when winner already drawn', async () => {
    mockFrom.mockReturnValue(makeRaffleQueryMock({ id: RAFFLE_ID, status: 'closed', winner_id: WINNER_ID }))
    const { PATCH } = await import('@/app/api/raffles/[id]/route')
    const res = await PATCH(makeReq('PATCH', { action: 'draw' }), makeParams())
    expect(res.status).toBe(409)
  })

  it('returns 400 when no participants', async () => {
    const participantsEq = vi.fn().mockResolvedValue({ data: [], error: null })
    const participantsSelect = vi.fn().mockReturnValue({ eq: participantsEq })

    mockFrom
      .mockReturnValueOnce(makeRaffleQueryMock({ id: RAFFLE_ID, status: 'closed', winner_id: null }))
      .mockReturnValueOnce({ select: participantsSelect })

    const { PATCH } = await import('@/app/api/raffles/[id]/route')
    const res = await PATCH(makeReq('PATCH', { action: 'draw' }), makeParams())
    expect(res.status).toBe(400)
  })

  it('draws winner and emits audit event', async () => {
    const participants = [{ id: WINNER_ID, raffle_id: RAFFLE_ID, name: 'Alice', registered_at: '2026-01-01' }]
    const participantsEq = vi.fn().mockResolvedValue({ data: participants, error: null })
    const participantsSelect = vi.fn().mockReturnValue({ eq: participantsEq })

    const updatedRaffle = { id: RAFFLE_ID, label: 'Golo', status: 'closed', duration_sec: 120, starts_at: '2026-01-01', ends_at: '2026-01-01', winner_id: WINNER_ID, created_at: '2026-01-01' }
    const updateSingle = vi.fn().mockResolvedValue({ data: updatedRaffle, error: null })
    const updateSelect = vi.fn().mockReturnValue({ single: updateSingle })
    const updateEq = vi.fn().mockReturnValue({ select: updateSelect })
    const updateMock = vi.fn().mockReturnValue({ eq: updateEq })

    mockFrom
      .mockReturnValueOnce(makeRaffleQueryMock({ id: RAFFLE_ID, status: 'closed', winner_id: null }))
      .mockReturnValueOnce({ select: participantsSelect })
      .mockReturnValueOnce({ update: updateMock })

    const { PATCH } = await import('@/app/api/raffles/[id]/route')
    const res = await PATCH(makeReq('PATCH', { action: 'draw' }), makeParams())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.winner.name).toBe('Alice')
    expect(mockAudit).toHaveBeenCalledWith(expect.objectContaining({ event: 'raffle.winner.selected' }))
  })
})
