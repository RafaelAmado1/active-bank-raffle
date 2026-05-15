import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const { mockFrom, mockCheckRateLimit, mockAudit } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockCheckRateLimit: vi.fn(),
  mockAudit: vi.fn(),
}))

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: mockFrom } }))
vi.mock('@/lib/rate-limit', () => ({ checkRateLimit: mockCheckRateLimit }))
vi.mock('@/lib/audit', () => ({ audit: mockAudit }))

function makeReq(body: unknown): NextRequest {
  return new NextRequest('https://example.com/api/entry', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '2.2.2.2' },
    body: JSON.stringify(body),
  })
}

const VALID_BODY = { name: 'Alice', phone: '+351912345678', email: 'alice@example.com', consent: true }

describe('POST /api/entry', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockCheckRateLimit.mockResolvedValue(true)
    mockAudit.mockImplementation(() => {})
  })

  it('returns 429 when rate limit exceeded', async () => {
    mockCheckRateLimit.mockResolvedValue(false)
    const { POST } = await import('@/app/api/entry/route')
    const res = await POST(makeReq(VALID_BODY))
    expect(res.status).toBe(429)
  })

  it('returns 400 when name is empty', async () => {
    const { POST } = await import('@/app/api/entry/route')
    const res = await POST(makeReq({ ...VALID_BODY, name: '' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when phone is invalid', async () => {
    const { POST } = await import('@/app/api/entry/route')
    const res = await POST(makeReq({ ...VALID_BODY, phone: 'not-a-phone' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when email is invalid', async () => {
    const { POST } = await import('@/app/api/entry/route')
    const res = await POST(makeReq({ ...VALID_BODY, email: 'not-an-email' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when consent is false', async () => {
    const { POST } = await import('@/app/api/entry/route')
    const res = await POST(makeReq({ ...VALID_BODY, consent: false }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when body is not JSON', async () => {
    const { POST } = await import('@/app/api/entry/route')
    const req = new NextRequest('https://example.com/api/entry', { method: 'POST', body: '{{bad' })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 201 and audits on successful entry', async () => {
    const entrantData = { id: 'entrant-id', name: 'Alice', entered_at: '2026-01-01' }
    const single = vi.fn().mockResolvedValue({ data: entrantData, error: null })
    const select = vi.fn().mockReturnValue({ single })
    const upsert = vi.fn().mockReturnValue({ select })
    mockFrom.mockReturnValue({ upsert })

    const { POST } = await import('@/app/api/entry/route')
    const res = await POST(makeReq(VALID_BODY))
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.id).toBe('entrant-id')
    expect(mockAudit).toHaveBeenCalledWith(expect.objectContaining({ event: 'lounge.entry', entrantId: 'entrant-id' }))
  })

  it('trims whitespace from name before insert', async () => {
    const entrantData = { id: 'eid', name: 'Alice', entered_at: '2026-01-01' }
    const single = vi.fn().mockResolvedValue({ data: entrantData, error: null })
    const select = vi.fn().mockReturnValue({ single })
    const upsert = vi.fn().mockReturnValue({ select })
    mockFrom.mockReturnValue({ upsert })

    const { POST } = await import('@/app/api/entry/route')
    // Phone and email must pass Zod validation (no surrounding spaces allowed by regex/email validator)
    // but name is trimmed server-side before DB insert
    await POST(makeReq({ ...VALID_BODY, name: '  Alice  ' }))
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Alice' }),
      expect.anything(),
    )
  })

  it('returns 500 on DB error', async () => {
    const single = vi.fn().mockResolvedValue({ data: null, error: { message: 'db fail' } })
    const select = vi.fn().mockReturnValue({ single })
    const upsert = vi.fn().mockReturnValue({ select })
    mockFrom.mockReturnValue({ upsert })

    const { POST } = await import('@/app/api/entry/route')
    const res = await POST(makeReq(VALID_BODY))
    expect(res.status).toBe(500)
  })

  it('uses upsert on phone conflict (re-entry is allowed)', async () => {
    const entrantData = { id: 'eid', name: 'Alice', entered_at: '2026-01-01' }
    const single = vi.fn().mockResolvedValue({ data: entrantData, error: null })
    const select = vi.fn().mockReturnValue({ single })
    const upsert = vi.fn().mockReturnValue({ select })
    mockFrom.mockReturnValue({ upsert })

    const { POST } = await import('@/app/api/entry/route')
    await POST(makeReq(VALID_BODY))
    expect(upsert).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ onConflict: 'phone' }),
    )
  })
})
