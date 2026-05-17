// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import '@testing-library/jest-dom'

expect.extend(toHaveNoViolations)

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/',
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    channel: () => ({ on: () => ({ subscribe: vi.fn() }) }),
    removeChannel: vi.fn(),
  }),
}))

import { PinGate } from '@/app/admin/PinGate'

const mockFetch = vi.fn(() => Promise.resolve({ ok: false, json: () => Promise.resolve({}) }))
vi.stubGlobal('fetch', mockFetch)

describe('Axe accessibility', () => {
  afterEach(cleanup)

  it('PinGate has no axe violations', async () => {
    const { container } = render(<PinGate onUnlock={vi.fn()} />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  }, 15000)
})
