import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const { mockIsAdmin } = vi.hoisted(() => ({ mockIsAdmin: vi.fn() }))

vi.mock('@/lib/admin-auth', () => ({ isAdminAuthenticated: mockIsAdmin }))

function makeReq(): NextRequest {
  return new NextRequest('https://example.com/api/admin/me')
}

describe('GET /api/admin/me', () => {
  beforeEach(() => vi.resetAllMocks())

  it('returns 200 with authenticated:true when session is valid', async () => {
    mockIsAdmin.mockResolvedValue(true)
    const { GET } = await import('@/app/api/admin/me/route')
    const res = await GET(makeReq())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.authenticated).toBe(true)
  })

  it('returns 401 with authenticated:false when no session', async () => {
    mockIsAdmin.mockResolvedValue(false)
    const { GET } = await import('@/app/api/admin/me/route')
    const res = await GET(makeReq())
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.authenticated).toBe(false)
  })
})
