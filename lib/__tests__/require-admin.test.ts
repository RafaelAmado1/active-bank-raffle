import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const { mockIsAdmin } = vi.hoisted(() => ({ mockIsAdmin: vi.fn() }))

vi.mock('../admin-auth', () => ({ isAdminAuthenticated: mockIsAdmin }))

import { requireAdmin } from '../require-admin'

function makeReq(): NextRequest {
  return new NextRequest('https://example.com/api/admin/something')
}

describe('requireAdmin', () => {
  beforeEach(() => vi.resetAllMocks())

  it('returns null when user is authenticated', async () => {
    mockIsAdmin.mockResolvedValue(true)
    const result = await requireAdmin(makeReq())
    expect(result).toBeNull()
  })

  it('returns 401 Response when user is not authenticated', async () => {
    mockIsAdmin.mockResolvedValue(false)
    const result = await requireAdmin(makeReq())
    expect(result).not.toBeNull()
    expect(result!.status).toBe(401)
    const body = await result!.json()
    expect(body.error).toBe('Unauthorized')
  })

  it('calls isAdminAuthenticated with the request', async () => {
    mockIsAdmin.mockResolvedValue(true)
    const req = makeReq()
    await requireAdmin(req)
    expect(mockIsAdmin).toHaveBeenCalledWith(req)
  })
})
