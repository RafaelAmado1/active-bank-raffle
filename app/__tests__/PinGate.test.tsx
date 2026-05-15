// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PinGate } from '@/app/admin/PinGate'

describe('PinGate', () => {
  const mockFetch = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch)
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    vi.resetAllMocks()
  })

  it('renders PIN input and disabled submit button', () => {
    render(<PinGate onUnlock={vi.fn()} />)
    expect(screen.getByPlaceholderText('PIN')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeDisabled()
  })

  it('enables submit button after typing a PIN', async () => {
    const user = userEvent.setup()
    render(<PinGate onUnlock={vi.fn()} />)
    await user.type(screen.getByPlaceholderText('PIN'), '1234')
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeEnabled()
  })

  it('calls onUnlock on successful login', async () => {
    const user = userEvent.setup()
    const onUnlock = vi.fn()
    mockFetch.mockResolvedValue({ ok: true })
    render(<PinGate onUnlock={onUnlock} />)
    await user.type(screen.getByPlaceholderText('PIN'), '1234')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))
    await waitFor(() => expect(onUnlock).toHaveBeenCalledTimes(1))
  })

  it('shows error and remaining attempts on wrong PIN', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue({ ok: false, status: 401 })
    render(<PinGate onUnlock={vi.fn()} />)
    await user.type(screen.getByPlaceholderText('PIN'), '9999')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('4 tentativas restantes'))
  })

  it('shows connection error when fetch throws', async () => {
    const user = userEvent.setup()
    mockFetch.mockRejectedValue(new Error('Network error'))
    render(<PinGate onUnlock={vi.fn()} />)
    await user.type(screen.getByPlaceholderText('PIN'), '1234')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Erro de ligação'))
  })
})
