// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CreateRaffleForm } from '@/app/admin/CreateRaffleForm'

describe('CreateRaffleForm', () => {
  const mockFetch = vi.fn()
  const onCreated = vi.fn()
  const onToast = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch)
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    vi.resetAllMocks()
  })

  it('initially shows only the "Novo sorteio" button', () => {
    render(<CreateRaffleForm onCreated={onCreated} onToast={onToast} />)
    expect(screen.getByText('+ Novo sorteio')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Ativar' })).not.toBeInTheDocument()
  })

  it('shows the form after clicking "Novo sorteio"', async () => {
    const user = userEvent.setup()
    render(<CreateRaffleForm onCreated={onCreated} onToast={onToast} />)
    await user.click(screen.getByText('+ Novo sorteio'))
    expect(screen.getByRole('button', { name: 'Ativar' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeInTheDocument()
  })

  it('submit button disabled until a label is selected', async () => {
    const user = userEvent.setup()
    render(<CreateRaffleForm onCreated={onCreated} onToast={onToast} />)
    await user.click(screen.getByText('+ Novo sorteio'))
    expect(screen.getByRole('button', { name: 'Ativar' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Golo' }))
    expect(screen.getByRole('button', { name: 'Ativar' })).toBeEnabled()
  })

  it('calls onCreated and success toast on successful creation', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue({ ok: true, json: vi.fn().mockResolvedValue({}) })
    render(<CreateRaffleForm onCreated={onCreated} onToast={onToast} />)
    await user.click(screen.getByText('+ Novo sorteio'))
    await user.click(screen.getByRole('button', { name: 'Golo' }))
    await user.click(screen.getByRole('button', { name: 'Ativar' }))
    await waitFor(() => {
      expect(onCreated).toHaveBeenCalledTimes(1)
      expect(onToast).toHaveBeenCalledWith('success', expect.stringContaining('Golo'))
    })
  })

  it('calls error toast on failed creation', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue({ ok: false, json: vi.fn().mockResolvedValue({ error: 'Erro do servidor' }) })
    render(<CreateRaffleForm onCreated={onCreated} onToast={onToast} />)
    await user.click(screen.getByText('+ Novo sorteio'))
    await user.click(screen.getByRole('button', { name: 'Golo' }))
    await user.click(screen.getByRole('button', { name: 'Ativar' }))
    await waitFor(() => expect(onToast).toHaveBeenCalledWith('error', 'Erro do servidor'))
  })

  it('dismiss via Cancelar hides the form', async () => {
    const user = userEvent.setup()
    render(<CreateRaffleForm onCreated={onCreated} onToast={onToast} />)
    await user.click(screen.getByText('+ Novo sorteio'))
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(screen.getByText('+ Novo sorteio')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Ativar' })).not.toBeInTheDocument()
  })
})
