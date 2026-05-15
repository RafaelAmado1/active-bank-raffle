import { describe, it, expect, vi } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('../env', () => ({
  getEnv: () => ({ ADMIN_SESSION_SECRET: 'test-secret-for-admin-auth-that-is-32chars' }),
}))

import { signAdminToken, verifyAdminToken, getAdminToken, isAdminAuthenticated, ADMIN_COOKIE } from '../admin-auth'

describe('signAdminToken / verifyAdminToken', () => {
  it('produces a token that verifies successfully', async () => {
    const token = await signAdminToken()
    expect(typeof token).toBe('string')
    expect(token.length).toBeGreaterThan(20)
    expect(await verifyAdminToken(token)).toBe(true)
  })

  it('rejects a garbage token', async () => {
    expect(await verifyAdminToken('not-a-jwt')).toBe(false)
  })

  it('rejects an empty string', async () => {
    expect(await verifyAdminToken('')).toBe(false)
  })

  it('rejects a token signed with a different secret', async () => {
    // Forge a JWT with a different secret — jose will reject the signature
    const { SignJWT } = await import('jose')
    const fakeSecret = new TextEncoder().encode('different-secret-that-is-32-chars!!')
    const fakeToken = await new SignJWT({ role: 'admin' })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('2h')
      .sign(fakeSecret)
    expect(await verifyAdminToken(fakeToken)).toBe(false)
  })

  it('rejects a token with wrong role payload', async () => {
    const { SignJWT } = await import('jose')
    const secret = new TextEncoder().encode('test-secret-for-admin-auth-that-is-32chars')
    const token = await new SignJWT({ role: 'user' })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('2h')
      .sign(secret)
    expect(await verifyAdminToken(token)).toBe(false)
  })
})

describe('getAdminToken', () => {
  it('returns the cookie value when present', () => {
    const req = new NextRequest('https://example.com/', {
      headers: { cookie: `${ADMIN_COOKIE}=my-token-value` },
    })
    expect(getAdminToken(req)).toBe('my-token-value')
  })

  it('returns undefined when cookie is absent', () => {
    const req = new NextRequest('https://example.com/')
    expect(getAdminToken(req)).toBeUndefined()
  })
})

describe('isAdminAuthenticated', () => {
  it('returns true for a valid signed token', async () => {
    const token = await signAdminToken()
    const req = new NextRequest('https://example.com/', {
      headers: { cookie: `${ADMIN_COOKIE}=${token}` },
    })
    expect(await isAdminAuthenticated(req)).toBe(true)
  })

  it('returns false when no cookie is present', async () => {
    const req = new NextRequest('https://example.com/')
    expect(await isAdminAuthenticated(req)).toBe(false)
  })

  it('returns false for an invalid token', async () => {
    const req = new NextRequest('https://example.com/', {
      headers: { cookie: `${ADMIN_COOKIE}=garbage` },
    })
    expect(await isAdminAuthenticated(req)).toBe(false)
  })
})
