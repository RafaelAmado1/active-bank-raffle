// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RaffleList } from '@/app/admin/RaffleList'
import type { Raffle, RaffleParticipant as Participant } from '@/lib/types'

const mkRaffle = (overrides: Partial<Raffle>): Raffle => ({
  id: 'r1', label: 'Golo', status: 'active',
  duration_sec: 120, starts_at: '2026-01-01T10:00:00Z',
  ends_at: null, winner_id: null, created_at: '2026-01-01',
  ...overrides,
})

const PARTICIPANT: Participant = {
  id: 'p1', raffle_id: 'r1', name: 'Alice',
  phone: '+351912345678', registered_at: '2026-01-01T10:00:30Z',
}

const noop = () => {}
const baseProps = {
  activeRaffles: [],
  closedWithoutWinner: [],
  closedWithWinner: [],
  archivedRaffles: [],
  participants: {},
  drawingId: null,
  showArchive: false,
  onToggleArchive: noop,
  onDraw: noop,
  onClose: noop,
  onReplay: noop,
  onArchive: noop,
  onUnarchive: noop,
}

describe('RaffleList', () => {
  afterEach(cleanup)

  it('shows empty state when there are no raffles', () => {
    render(<RaffleList {...baseProps} />)
    expect(screen.getByText(/Nenhum sorteio criado ainda/)).toBeInTheDocument()
  })

  it('renders active raffle with participant count', () => {
    const raffle = mkRaffle({ id: 'r1', label: 'Golo' })
    render(<RaffleList {...baseProps}
      activeRaffles={[raffle]}
      participants={{ r1: [PARTICIPANT] }}
    />)
    expect(screen.getByText('Golo')).toBeInTheDocument()
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sortear vencedor' })).toBeEnabled()
  })

  it('draw button is disabled when there are no participants', () => {
    const raffle = mkRaffle({ id: 'r1' })
    render(<RaffleList {...baseProps} activeRaffles={[raffle]} participants={{ r1: [] }} />)
    expect(screen.getByRole('button', { name: 'Sortear vencedor' })).toBeDisabled()
  })

  it('calls onDraw with raffle id and label', async () => {
    const user = userEvent.setup()
    const onDraw = vi.fn()
    const raffle = mkRaffle({ id: 'r1', label: 'Final' })
    render(<RaffleList {...baseProps}
      activeRaffles={[raffle]}
      participants={{ r1: [PARTICIPANT] }}
      onDraw={onDraw}
    />)
    await user.click(screen.getByRole('button', { name: 'Sortear vencedor' }))
    expect(onDraw).toHaveBeenCalledWith('r1', 'Final')
  })

  it('calls onClose when "Encerrar sem vencedor" is clicked', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    const raffle = mkRaffle({ id: 'r1' })
    render(<RaffleList {...baseProps}
      activeRaffles={[raffle]}
      participants={{ r1: [PARTICIPANT] }}
      onClose={onClose}
    />)
    await user.click(screen.getByRole('button', { name: 'Encerrar sem vencedor' }))
    expect(onClose).toHaveBeenCalledWith('r1')
  })

  it('renders closed raffle with winner and calls onReplay', async () => {
    const user = userEvent.setup()
    const onReplay = vi.fn()
    const raffle = mkRaffle({ id: 'r2', label: 'Intervalo', status: 'closed', winner_id: 'p1', ends_at: '2026-01-01T10:02:00Z' })
    render(<RaffleList {...baseProps} closedWithWinner={[raffle]} onReplay={onReplay} />)
    const btn = screen.getByRole('button', { name: /Mostrar no ecrã/ })
    expect(btn).toBeInTheDocument()
    await user.click(btn)
    expect(onReplay).toHaveBeenCalledWith('r2', 'Intervalo')
  })

  it('shows archived section and toggles visibility', async () => {
    const user = userEvent.setup()
    const onToggleArchive = vi.fn()
    const raffle = mkRaffle({ id: 'r3', label: 'Primeiro Canto', status: 'closed', ends_at: '2026-01-01T10:10:00Z' })
    render(<RaffleList {...baseProps}
      archivedRaffles={[raffle]}
      showArchive={false}
      onToggleArchive={onToggleArchive}
    />)
    expect(screen.getByText(/Arquivo/)).toBeInTheDocument()
    await user.click(screen.getByText(/Arquivo/))
    expect(onToggleArchive).toHaveBeenCalledTimes(1)
  })
})
