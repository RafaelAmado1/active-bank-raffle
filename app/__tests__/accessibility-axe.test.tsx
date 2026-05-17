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

vi.mock('next/image', () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement> & { src: string; alt: string }) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...props} />
  },
}))

import { PinGate } from '@/app/admin/PinGate'
import EntryPage from '@/app/entry/page'
import { RaffleList } from '@/app/admin/RaffleList'

vi.mock('@/app/components/PageShell', () => ({
  PageHeader: () => <header><h1>ActivoBank</h1></header>,
  PageFooter: () => <footer>Footer</footer>,
}))

const mockFetch = vi.fn(() => Promise.resolve({ ok: false, json: () => Promise.resolve({}) }))
vi.stubGlobal('fetch', mockFetch)

const emptyRaffleListProps = {
  activeRaffles: [],
  closedWithoutWinner: [],
  closedWithWinner: [],
  archivedRaffles: [],
  participants: {},
  drawingId: null,
  showArchive: false,
  onToggleArchive: vi.fn(),
  onDraw: vi.fn(),
  onClose: vi.fn(),
  onReplay: vi.fn(),
  onArchive: vi.fn(),
  onUnarchive: vi.fn(),
}

describe('Axe accessibility', () => {
  afterEach(cleanup)

  it('PinGate has no axe violations', async () => {
    const { container } = render(<PinGate onUnlock={vi.fn()} />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  }, 15000)

  it('EntryPage has no axe violations', async () => {
    const { container } = render(<EntryPage />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  }, 15000)

  it('RaffleList (empty state) has no axe violations', async () => {
    const { container } = render(<RaffleList {...emptyRaffleListProps} />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  }, 15000)
})
