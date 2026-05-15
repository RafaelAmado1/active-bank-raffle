// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import EntryPage from '@/app/entry/page'

vi.mock('@/app/components/PageShell', () => ({
  PageHeader: () => <header data-testid="page-header" />,
  PageFooter: () => <footer data-testid="page-footer" />,
}))

describe('EntryPage', () => {
  const mockFetch = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch)
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    vi.resetAllMocks()
  })

  it('renders all form fields', () => {
    render(<EntryPage />)
    expect(screen.getByLabelText('Nome')).toBeInTheDocument()
    expect(screen.getByLabelText('Telemóvel')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByRole('checkbox')).toBeInTheDocument()
  })

  it('submit button is disabled without consent', () => {
    render(<EntryPage />)
    expect(screen.getByRole('button', { name: 'Entrar no Lounge' })).toBeDisabled()
  })

  it('submit button is enabled after checking consent', async () => {
    const user = userEvent.setup()
    render(<EntryPage />)
    await user.click(screen.getByRole('checkbox'))
    expect(screen.getByRole('button', { name: 'Entrar no Lounge' })).toBeEnabled()
  })

  it('sends consent:true in request body', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue({ ok: true, json: vi.fn().mockResolvedValue({}) })
    render(<EntryPage />)
    await user.type(screen.getByLabelText('Nome'), 'Alice')
    await user.type(screen.getByLabelText('Telemóvel'), '+351912345678')
    await user.type(screen.getByLabelText('Email'), 'alice@example.com')
    await user.click(screen.getByRole('checkbox'))
    await user.click(screen.getByRole('button', { name: 'Entrar no Lounge' }))
    await waitFor(() => expect(mockFetch).toHaveBeenCalled())
    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.consent).toBe(true)
    expect(body.name).toBe('Alice')
  })

  it('shows success screen on successful registration', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue({ ok: true, json: vi.fn().mockResolvedValue({}) })
    render(<EntryPage />)
    await user.type(screen.getByLabelText('Nome'), 'Alice')
    await user.type(screen.getByLabelText('Telemóvel'), '+351912345678')
    await user.type(screen.getByLabelText('Email'), 'alice@example.com')
    await user.click(screen.getByRole('checkbox'))
    await user.click(screen.getByRole('button', { name: 'Entrar no Lounge' }))
    await waitFor(() => expect(screen.getByText('Bem-vindo ao Lounge!')).toBeInTheDocument())
  })

  it('shows error message on failed registration', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue({
      ok: false,
      json: vi.fn().mockResolvedValue({ error: 'Número já registado.' }),
    })
    render(<EntryPage />)
    await user.type(screen.getByLabelText('Nome'), 'Bob')
    await user.type(screen.getByLabelText('Telemóvel'), '+351912345679')
    await user.type(screen.getByLabelText('Email'), 'bob@example.com')
    await user.click(screen.getByRole('checkbox'))
    await user.click(screen.getByRole('button', { name: 'Entrar no Lounge' }))
    await waitFor(() => expect(screen.getByText('Número já registado.')).toBeInTheDocument())
  })
})
