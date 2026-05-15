import { describe, it, expect, vi, beforeEach } from 'vitest'

const VALID_ENV = {
  NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
  SUPABASE_SERVICE_ROLE_KEY: 'service-key',
  QR_SECRET: 'a'.repeat(32),
  ADMIN_PIN: 'Abc123!@#defg',
  ADMIN_SESSION_SECRET: 'b'.repeat(32),
  NEXT_PUBLIC_APP_URL: 'https://example.com',
  CRON_SECRET: 'c'.repeat(32),
}

describe('getEnv()', () => {
  beforeEach(() => {
    // Reset the module-level cache between tests
    vi.resetModules()
    // Reset process.env to valid state
    Object.assign(process.env, VALID_ENV)
  })

  it('returns parsed env when all variables are valid', async () => {
    const { getEnv } = await import('../env')
    const env = getEnv()
    expect(env.NEXT_PUBLIC_SUPABASE_URL).toBe(VALID_ENV.NEXT_PUBLIC_SUPABASE_URL)
    expect(env.QR_SECRET).toBe(VALID_ENV.QR_SECRET)
  })

  it('throws when QR_SECRET is too short', async () => {
    process.env.QR_SECRET = 'short'
    const { getEnv } = await import('../env')
    expect(() => getEnv()).toThrow('QR_SECRET')
  })

  it('throws when ADMIN_PIN is absent', async () => {
    process.env.ADMIN_PIN = ''
    const { getEnv } = await import('../env')
    expect(() => getEnv()).toThrow('ADMIN_PIN')
  })

  it('throws when NEXT_PUBLIC_SUPABASE_URL is not a valid URL', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'not-a-url'
    const { getEnv } = await import('../env')
    expect(() => getEnv()).toThrow('NEXT_PUBLIC_SUPABASE_URL')
  })

  it('caches the result — validation only runs once per module load', async () => {
    const { getEnv } = await import('../env')
    const first = getEnv()
    const second = getEnv()
    expect(first).toBe(second)
  })
})
