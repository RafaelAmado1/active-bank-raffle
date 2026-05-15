import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const { mockAudit } = vi.hoisted(() => ({ mockAudit: vi.fn() }))

vi.mock('@/lib/audit', () => ({ audit: mockAudit }))
vi.mock('@/lib/admin-auth', () => ({ ADMIN_COOKIE: 'admin_session' }))

function makeReq(): NextRequest {
  return new NextRequest('https://example.com/api/admin/logout', {
    method: 'POST',
    headers: { 'x-forwarded-for': '5.5.5.5' },
  })
}

describe('POST /api/admin/logout', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockAudit.mockImplementation(() => {})
  })

  it('returns 200 with ok:true', async () => {
    const { POST } = await import('@/app/api/admin/logout/route')
    const res = await POST(makeReq())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
  })

  it('clears the admin_session cookie (Max-Age=0)', async () => {
    const { POST } = await import('@/app/api/admin/logout/route')
    const res = await POST(makeReq())
    const cookie = res.headers.get('Set-Cookie') ?? ''
    expect(cookie).toContain('admin_session=')
    expect(cookie).toContain('Max-Age=0')
  })

  it('cookie has HttpOnly and SameSite=Strict', async () => {
    const { POST } = await import('@/app/api/admin/logout/route')
    const res = await POST(makeReq())
    const cookie = res.headers.get('Set-Cookie') ?? ''
    expect(cookie).toContain('HttpOnly')
    expect(cookie).toContain('SameSite=Strict')
  })

  it('audits the logout event with correct IP', async () => {
    const { POST } = await import('@/app/api/admin/logout/route')
    await POST(makeReq())
    expect(mockAudit).toHaveBeenCalledWith(expect.objectContaining({ event: 'admin.logout', ip: '5.5.5.5' }))
  })
})
