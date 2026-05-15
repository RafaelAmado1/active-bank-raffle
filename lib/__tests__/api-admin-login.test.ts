import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const { mockCheckRateLimit, mockAudit, mockSignAdminToken } = vi.hoisted(() => ({
  mockCheckRateLimit: vi.fn(),
  mockAudit: vi.fn(),
  mockSignAdminToken: vi.fn(),
}))

vi.mock('@/lib/rate-limit', () => ({ checkRateLimit: mockCheckRateLimit }))
vi.mock('@/lib/audit', () => ({ audit: mockAudit }))
vi.mock('@/lib/admin-auth', () => ({
  signAdminToken: mockSignAdminToken,
  ADMIN_COOKIE: 'admin_session',
}))
vi.mock('@/lib/env', () => ({
  getEnv: () => ({ ADMIN_PIN: 'CorrectPin123!@#' }),
}))

function makeReq(body: unknown): NextRequest {
  return new NextRequest('https://example.com/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '1.2.3.4' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/admin/login', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockCheckRateLimit.mockResolvedValue(true)
    mockSignAdminToken.mockResolvedValue('signed-jwt-token')
    mockAudit.mockImplementation(() => {})
  })

  it('returns 429 when rate limit exceeded', async () => {
    mockCheckRateLimit.mockResolvedValue(false)
    const { POST } = await import('@/app/api/admin/login/route')
    const res = await POST(makeReq({ pin: 'CorrectPin123!@#' }))
    expect(res.status).toBe(429)
    expect(mockAudit).toHaveBeenCalledWith(expect.objectContaining({ event: 'rate_limit.exceeded' }))
  })

  it('returns 400 when body is not valid JSON', async () => {
    const { POST } = await import('@/app/api/admin/login/route')
    const req = new NextRequest('https://example.com/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-json{{{',
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 when pin is missing', async () => {
    const { POST } = await import('@/app/api/admin/login/route')
    const res = await POST(makeReq({}))
    expect(res.status).toBe(400)
  })

  it('returns 400 when pin is empty string', async () => {
    const { POST } = await import('@/app/api/admin/login/route')
    const res = await POST(makeReq({ pin: '' }))
    expect(res.status).toBe(400)
  })

  it('returns 401 and audits failure when PIN is wrong', async () => {
    const { POST } = await import('@/app/api/admin/login/route')
    const res = await POST(makeReq({ pin: 'WrongPin!!!' }))
    expect(res.status).toBe(401)
    expect(mockAudit).toHaveBeenCalledWith(expect.objectContaining({ event: 'admin.login.failure', ip: '1.2.3.4' }))
  })

  it('returns 200 and sets HttpOnly cookie when PIN is correct', async () => {
    const { POST } = await import('@/app/api/admin/login/route')
    const res = await POST(makeReq({ pin: 'CorrectPin123!@#' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    const cookie = res.headers.get('Set-Cookie') ?? ''
    expect(cookie).toContain('admin_session=signed-jwt-token')
    expect(cookie).toContain('HttpOnly')
    expect(cookie).toContain('Secure')
    expect(cookie).toContain('SameSite=Strict')
  })

  it('audits success on correct PIN', async () => {
    const { POST } = await import('@/app/api/admin/login/route')
    await POST(makeReq({ pin: 'CorrectPin123!@#' }))
    expect(mockAudit).toHaveBeenCalledWith(expect.objectContaining({ event: 'admin.login.success', ip: '1.2.3.4' }))
  })

  it('does not call signAdminToken on wrong PIN', async () => {
    const { POST } = await import('@/app/api/admin/login/route')
    await POST(makeReq({ pin: 'WrongPin!!!' }))
    expect(mockSignAdminToken).not.toHaveBeenCalled()
  })
})
