import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const { mockFrom, mockCheckRateLimit, mockCurrentToken, mockQrToDataURL } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockCheckRateLimit: vi.fn(),
  mockCurrentToken: vi.fn(),
  mockQrToDataURL: vi.fn().mockResolvedValue('data:image/png;base64,fakeqr'),
}))

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: mockFrom } }))
vi.mock('@/lib/rate-limit', () => ({ checkRateLimit: mockCheckRateLimit }))
vi.mock('@/lib/tokens', () => ({ currentToken: mockCurrentToken }))
vi.mock('@/lib/env', () => ({ getEnv: () => ({ NEXT_PUBLIC_APP_URL: 'https://example.com', QR_SECRET: 'x'.repeat(32) }) }))
vi.mock('qrcode', () => ({ toDataURL: mockQrToDataURL }))

const RAFFLE_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'

function makeReq(): NextRequest {
  return new NextRequest(`https://example.com/api/raffles/${RAFFLE_ID}/qr`, {
    headers: { 'x-forwarded-for': '1.2.3.4' },
  })
}
function makeParams(id = RAFFLE_ID) {
  return { params: Promise.resolve({ id }) }
}

describe('GET /api/raffles/[id]/qr', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockCheckRateLimit.mockResolvedValue(true)
    mockCurrentToken.mockReturnValue({ token: 'abc123token', expiresAt: Date.now() + 120_000 })
    mockQrToDataURL.mockResolvedValue('data:image/png;base64,fakeqr')
  })

  it('returns 429 when rate limit exceeded', async () => {
    mockCheckRateLimit.mockResolvedValue(false)
    const { GET } = await import('@/app/api/raffles/[id]/qr/route')
    const res = await GET(makeReq(), makeParams())
    expect(res.status).toBe(429)
  })

  it('returns 400 for invalid UUID', async () => {
    const { GET } = await import('@/app/api/raffles/[id]/qr/route')
    const res = await GET(makeReq(), { params: Promise.resolve({ id: 'not-a-uuid' }) })
    expect(res.status).toBe(400)
  })

  it('returns 404 when raffle not found', async () => {
    const single = vi.fn().mockResolvedValue({ data: null, error: { message: 'not found' } })
    const eq = vi.fn().mockReturnValue({ single })
    mockFrom.mockReturnValue({ select: vi.fn().mockReturnValue({ eq }) })
    const { GET } = await import('@/app/api/raffles/[id]/qr/route')
    const res = await GET(makeReq(), makeParams())
    expect(res.status).toBe(404)
  })

  it('returns 410 when raffle is closed', async () => {
    const single = vi.fn().mockResolvedValue({ data: { id: RAFFLE_ID, label: 'Golo', status: 'closed', duration_sec: 120, starts_at: '2026-01-01T00:00:00Z' }, error: null })
    const eq = vi.fn().mockReturnValue({ single })
    mockFrom.mockReturnValue({ select: vi.fn().mockReturnValue({ eq }) })
    const { GET } = await import('@/app/api/raffles/[id]/qr/route')
    const res = await GET(makeReq(), makeParams())
    expect(res.status).toBe(410)
  })

  it('returns 200 with correct shape for active raffle', async () => {
    const single = vi.fn().mockResolvedValue({ data: { id: RAFFLE_ID, label: 'Golo', status: 'active', duration_sec: 120, starts_at: '2026-01-01T00:00:00Z' }, error: null })
    const eq = vi.fn().mockReturnValue({ single })
    mockFrom.mockReturnValue({ select: vi.fn().mockReturnValue({ eq }) })
    const { GET } = await import('@/app/api/raffles/[id]/qr/route')
    const res = await GET(makeReq(), makeParams())
    const body = await res.json()
    expect(res.status, `body was: ${JSON.stringify(body)}`).toBe(200)
    expect(body.raffle_id).toBe(RAFFLE_ID)
    expect(body.label).toBe('Golo')
    expect(body).toHaveProperty('expires_at')
    expect(body).toHaveProperty('ends_at')
    expect(body).toHaveProperty('qr_data_url')
    expect(body).not.toHaveProperty('register_url')
  })

  it('sets Cache-Control header with s-maxage=30', async () => {
    const single = vi.fn().mockResolvedValue({ data: { id: RAFFLE_ID, label: 'Golo', status: 'active', duration_sec: 120, starts_at: '2026-01-01T00:00:00Z' }, error: null })
    const eq = vi.fn().mockReturnValue({ single })
    mockFrom.mockReturnValue({ select: vi.fn().mockReturnValue({ eq }) })
    const { GET } = await import('@/app/api/raffles/[id]/qr/route')
    const res = await GET(makeReq(), makeParams())
    expect(res.headers.get('Cache-Control')).toContain('s-maxage=30')
  })

  it('does not expose the register URL in the response body', async () => {
    const single = vi.fn().mockResolvedValue({ data: { id: RAFFLE_ID, label: 'Golo', status: 'active', duration_sec: 120, starts_at: '2026-01-01T00:00:00Z' }, error: null })
    const eq = vi.fn().mockReturnValue({ single })
    mockFrom.mockReturnValue({ select: vi.fn().mockReturnValue({ eq }) })
    const { GET } = await import('@/app/api/raffles/[id]/qr/route')
    const res = await GET(makeReq(), makeParams())
    const body = await res.json()
    expect(JSON.stringify(body)).not.toContain('register_url')
    expect(JSON.stringify(body)).not.toContain('abc123token')
  })
})
