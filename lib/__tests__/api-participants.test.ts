import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockFrom, mockRpc, mockValidateToken, mockCheckRateLimit, mockIsAdmin, mockRequireAdmin, mockAudit } =
  vi.hoisted(() => ({
    mockFrom: vi.fn(),
    mockRpc: vi.fn(),
    mockValidateToken: vi.fn(),
    mockCheckRateLimit: vi.fn(),
    mockIsAdmin: vi.fn(),
    mockRequireAdmin: vi.fn(),
    mockAudit: vi.fn(),
  }))

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: { from: mockFrom, rpc: mockRpc },
}))
vi.mock('@/lib/tokens', () => ({ validateToken: mockValidateToken }))
vi.mock('@/lib/rate-limit', () => ({ checkRateLimit: mockCheckRateLimit }))
vi.mock('@/lib/admin-auth', () => ({ isAdminAuthenticated: mockIsAdmin }))
vi.mock('@/lib/require-admin', () => ({ requireAdmin: mockRequireAdmin }))
vi.mock('@/lib/audit', () => ({ audit: mockAudit }))
vi.mock('@/lib/env', () => ({ getEnv: () => ({ QR_SECRET: 'x'.repeat(32) }) }))

// ── Helpers ───────────────────────────────────────────────────────────────────

const RAFFLE_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
const PARTICIPANT_ID = 'bbbbbbbb-cccc-dddd-eeee-ffffffffffff'

function makeRaffleQueryMock(data: unknown, error: unknown = null) {
  const single = vi.fn().mockResolvedValue({ data, error })
  const eq = vi.fn().mockReturnValue({ single })
  const select = vi.fn().mockReturnValue({ eq })
  return { select }
}

function makeReq(method: string, body?: unknown, params?: Record<string, string>): NextRequest {
  const url = `https://example.com/api/raffles/${RAFFLE_ID}/participants`
  const req = new NextRequest(url, {
    method,
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '1.2.3.4' },
    body: body ? JSON.stringify(body) : undefined,
  })
  return req
}

function makeParams(id = RAFFLE_ID) {
  return { params: Promise.resolve({ id }) }
}

// ── Tests: POST (register participant) ───────────────────────────────────────

describe('POST /api/raffles/[id]/participants', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockCheckRateLimit.mockResolvedValue(true)
    mockValidateToken.mockReturnValue(true)
    mockIsAdmin.mockResolvedValue(false)
    mockAudit.mockImplementation(() => {})
  })

  it('returns 429 when rate limit exceeded', async () => {
    mockCheckRateLimit.mockResolvedValue(false)
    const { POST } = await import('@/app/api/raffles/[id]/participants/route')
    const req = makeReq('POST', { name: 'Test', phone: '+351912345678', email: 't@t.com', token: 'tok', consent: true })
    const res = await POST(req, makeParams())
    expect(res.status).toBe(429)
  })

  it('returns 400 for invalid raffle UUID', async () => {
    const { POST } = await import('@/app/api/raffles/[id]/participants/route')
    const req = makeReq('POST', { name: 'Test', phone: '+351912345678', email: 't@t.com', token: 'tok', consent: true })
    const res = await POST(req, { params: Promise.resolve({ id: 'not-a-uuid' }) })
    expect(res.status).toBe(400)
  })

  it('returns 400 for invalid body', async () => {
    const { POST } = await import('@/app/api/raffles/[id]/participants/route')
    const req = makeReq('POST', { name: '', phone: 'bad', email: 'not-email', token: '', consent: false })
    const res = await POST(req, makeParams())
    expect(res.status).toBe(400)
  })

  it('returns 404 when raffle not found', async () => {
    mockFrom.mockReturnValue(makeRaffleQueryMock(null, { message: 'not found' }))
    const { POST } = await import('@/app/api/raffles/[id]/participants/route')
    const req = makeReq('POST', { name: 'Test', phone: '+351912345678', email: 't@t.com', token: 'tok', consent: true })
    const res = await POST(req, makeParams())
    expect(res.status).toBe(404)
  })

  it('returns 410 when raffle is closed', async () => {
    mockFrom.mockReturnValue(makeRaffleQueryMock({ id: RAFFLE_ID, label: 'Golo', status: 'closed' }))
    const { POST } = await import('@/app/api/raffles/[id]/participants/route')
    const req = makeReq('POST', { name: 'Test', phone: '+351912345678', email: 't@t.com', token: 'tok', consent: true })
    const res = await POST(req, makeParams())
    expect(res.status).toBe(410)
  })

  it('returns 422 when token is invalid', async () => {
    mockValidateToken.mockReturnValue(false)
    mockFrom.mockReturnValue(makeRaffleQueryMock({ id: RAFFLE_ID, label: 'Golo', status: 'active' }))
    const { POST } = await import('@/app/api/raffles/[id]/participants/route')
    const req = makeReq('POST', { name: 'Test', phone: '+351912345678', email: 't@t.com', token: 'bad-token', consent: true })
    const res = await POST(req, makeParams())
    expect(res.status).toBe(422)
  })

  it('returns 409 when participant already registered (duplicate phone)', async () => {
    const insertSingle = vi.fn().mockResolvedValue({ data: null, error: { code: '23505', message: 'duplicate' } })
    const insertSelect = vi.fn().mockReturnValue({ single: insertSingle })
    const insertMock = vi.fn().mockReturnValue({ select: insertSelect })

    mockFrom
      .mockReturnValueOnce(makeRaffleQueryMock({ id: RAFFLE_ID, label: 'Golo', status: 'active' }))
      .mockReturnValueOnce({ insert: insertMock })

    const { POST } = await import('@/app/api/raffles/[id]/participants/route')
    const req = makeReq('POST', { name: 'Test', phone: '+351912345678', email: 't@t.com', token: 'tok', consent: true })
    const res = await POST(req, makeParams())
    expect(res.status).toBe(409)
  })

  it('returns 201 on successful registration', async () => {
    const participantData = { id: PARTICIPANT_ID, raffle_id: RAFFLE_ID, name: 'Test', registered_at: new Date().toISOString() }
    const insertSingle = vi.fn().mockResolvedValue({ data: participantData, error: null })
    const insertSelect = vi.fn().mockReturnValue({ single: insertSingle })
    const insertMock = vi.fn().mockReturnValue({ select: insertSelect })

    mockFrom
      .mockReturnValueOnce(makeRaffleQueryMock({ id: RAFFLE_ID, label: 'Golo', status: 'active' }))
      .mockReturnValueOnce({ insert: insertMock })

    const { POST } = await import('@/app/api/raffles/[id]/participants/route')
    const req = makeReq('POST', { name: 'Test', phone: '+351912345678', email: 't@t.com', token: 'tok', consent: true })
    const res = await POST(req, makeParams())
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.raffle_label).toBe('Golo')
    expect(mockAudit).toHaveBeenCalledWith(expect.objectContaining({ event: 'participant.registered' }))
  })
})

// ── Tests: GET (list participants) ───────────────────────────────────────────

describe('GET /api/raffles/[id]/participants', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockIsAdmin.mockResolvedValue(false)
  })

  it('returns 400 for invalid UUID', async () => {
    const { GET } = await import('@/app/api/raffles/[id]/participants/route')
    const req = makeReq('GET')
    const res = await GET(req, { params: Promise.resolve({ id: 'bad-uuid' }) })
    expect(res.status).toBe(400)
  })

  it('strips phone and email for non-admin', async () => {
    const orderMock = vi.fn().mockResolvedValue({
      data: [{ id: PARTICIPANT_ID, raffle_id: RAFFLE_ID, name: 'Test', registered_at: '2026-01-01' }],
      error: null,
    })
    const eqMock = vi.fn().mockReturnValue({ order: orderMock })
    mockFrom.mockReturnValue({ select: vi.fn().mockReturnValue({ eq: eqMock }) })

    const { GET } = await import('@/app/api/raffles/[id]/participants/route')
    const req = makeReq('GET')
    const res = await GET(req, makeParams())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body[0]).not.toHaveProperty('phone')
    expect(body[0]).not.toHaveProperty('email')
  })

  it('includes phone and email for admin', async () => {
    mockIsAdmin.mockResolvedValue(true)
    const participantWithPII = { id: PARTICIPANT_ID, raffle_id: RAFFLE_ID, name: 'Test', phone: '+351912345678', email: 'test@example.com', registered_at: '2026-01-01' }
    const orderMock = vi.fn().mockResolvedValue({ data: [participantWithPII], error: null })
    const eqMock = vi.fn().mockReturnValue({ order: orderMock })
    mockFrom.mockReturnValue({ select: vi.fn().mockReturnValue({ eq: eqMock }) })

    const { GET } = await import('@/app/api/raffles/[id]/participants/route')
    const req = makeReq('GET')
    const res = await GET(req, makeParams())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body[0].phone).toBe('+351912345678')
    expect(body[0].email).toBe('test@example.com')
  })

  it('returns 500 when database query fails', async () => {
    const orderMock = vi.fn().mockResolvedValue({ data: null, error: { message: 'db error' } })
    const eqMock = vi.fn().mockReturnValue({ order: orderMock })
    mockFrom.mockReturnValue({ select: vi.fn().mockReturnValue({ eq: eqMock }) })

    const { GET } = await import('@/app/api/raffles/[id]/participants/route')
    const req = makeReq('GET')
    const res = await GET(req, makeParams())
    expect(res.status).toBe(500)
  })
})

// ── Tests: DELETE (remove participant) ───────────────────────────────────────

describe('DELETE /api/raffles/[id]/participants', () => {
  function makeDeleteReq(participantId?: string): NextRequest {
    const url = participantId
      ? `https://example.com/api/raffles/${RAFFLE_ID}/participants?participant_id=${participantId}`
      : `https://example.com/api/raffles/${RAFFLE_ID}/participants`
    return new NextRequest(url, {
      method: 'DELETE',
      headers: { 'x-forwarded-for': '1.2.3.4' },
    })
  }

  beforeEach(() => {
    vi.resetAllMocks()
    mockRequireAdmin.mockResolvedValue(null)
    mockCheckRateLimit.mockResolvedValue(true)
    mockAudit.mockImplementation(() => {})
  })

  it('returns 401 when not authenticated', async () => {
    mockRequireAdmin.mockResolvedValue(Response.json({ error: 'Unauthorized' }, { status: 401 }))
    const { DELETE } = await import('@/app/api/raffles/[id]/participants/route')
    const res = await DELETE(makeDeleteReq(PARTICIPANT_ID), makeParams())
    expect(res.status).toBe(401)
  })

  it('returns 429 when rate limit exceeded', async () => {
    mockCheckRateLimit.mockResolvedValue(false)
    const { DELETE } = await import('@/app/api/raffles/[id]/participants/route')
    const res = await DELETE(makeDeleteReq(PARTICIPANT_ID), makeParams())
    expect(res.status).toBe(429)
    expect(mockAudit).toHaveBeenCalledWith(expect.objectContaining({ event: 'rate_limit.exceeded' }))
  })

  it('returns 400 for invalid raffle UUID', async () => {
    const { DELETE } = await import('@/app/api/raffles/[id]/participants/route')
    const res = await DELETE(makeDeleteReq(PARTICIPANT_ID), { params: Promise.resolve({ id: 'bad-uuid' }) })
    expect(res.status).toBe(400)
  })

  it('returns 400 when participant_id is missing', async () => {
    const { DELETE } = await import('@/app/api/raffles/[id]/participants/route')
    const res = await DELETE(makeDeleteReq(), makeParams())
    expect(res.status).toBe(400)
  })

  it('returns 400 for invalid participant_id (not a UUID)', async () => {
    const { DELETE } = await import('@/app/api/raffles/[id]/participants/route')
    const res = await DELETE(makeDeleteReq('not-a-uuid'), makeParams())
    expect(res.status).toBe(400)
  })

  it('returns 404 when participant not found in this raffle', async () => {
    const single = vi.fn().mockResolvedValue({ data: null, error: { message: 'not found' } })
    const eq2 = vi.fn().mockReturnValue({ single })
    const eq1 = vi.fn().mockReturnValue({ eq: eq2 })
    const select = vi.fn().mockReturnValue({ eq: eq1 })
    mockFrom.mockReturnValue({ select })

    const { DELETE } = await import('@/app/api/raffles/[id]/participants/route')
    const res = await DELETE(makeDeleteReq(PARTICIPANT_ID), makeParams())
    expect(res.status).toBe(404)
  })

  it('returns 500 when rpc delete fails', async () => {
    const single = vi.fn().mockResolvedValue({ data: { id: PARTICIPANT_ID }, error: null })
    const eq2 = vi.fn().mockReturnValue({ single })
    const eq1 = vi.fn().mockReturnValue({ eq: eq2 })
    const select = vi.fn().mockReturnValue({ eq: eq1 })
    mockFrom.mockReturnValue({ select })
    mockRpc.mockResolvedValue({ error: { message: 'rpc failed' } })

    const { DELETE } = await import('@/app/api/raffles/[id]/participants/route')
    const res = await DELETE(makeDeleteReq(PARTICIPANT_ID), makeParams())
    expect(res.status).toBe(500)
  })

  it('deletes participant and returns ok', async () => {
    const single = vi.fn().mockResolvedValue({ data: { id: PARTICIPANT_ID }, error: null })
    const eq2 = vi.fn().mockReturnValue({ single })
    const eq1 = vi.fn().mockReturnValue({ eq: eq2 })
    const select = vi.fn().mockReturnValue({ eq: eq1 })
    mockFrom.mockReturnValue({ select })
    mockRpc.mockResolvedValue({ error: null })

    const { DELETE } = await import('@/app/api/raffles/[id]/participants/route')
    const res = await DELETE(makeDeleteReq(PARTICIPANT_ID), makeParams())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(mockRpc).toHaveBeenCalledWith('delete_raffle_participant_data', { p_participant_id: PARTICIPANT_ID })
    expect(mockAudit).toHaveBeenCalledWith(expect.objectContaining({ event: 'participant.deleted' }))
  })
})
