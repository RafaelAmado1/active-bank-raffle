'use client'

import { useState, FormEvent } from 'react'
import { PageHeader, PageFooter } from '@/app/components/PageShell'

type State = 'idle' | 'loading' | 'success' | 'error'

export default function EntryPage() {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [consent, setConsent] = useState(false)
  const [state, setState] = useState<State>('idle')
  const [message, setMessage] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!consent) return
    setState('loading')
    try {
      const res = await fetch('/api/entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, email, consent }),
      })
      const data = await res.json()
      if (res.ok) {
        setState('success')
      } else {
        setMessage(data.error ?? 'Erro inesperado.')
        setState('error')
      }
    } catch {
      setMessage('Erro de ligação. Tenta de novo.')
      setState('error')
    }
  }

  if (state === 'success') {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <PageHeader />
        <main className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <div className="w-16 h-16 rounded-full bg-[#0096DC]/10 flex items-center justify-center mb-6">
            <svg className="w-8 h-8 text-[#0096DC]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-3xl font-semibold text-[#0A0A0A] tracking-tight mb-2">Bem-vindo ao Lounge!</h1>
          <p className="text-sm text-[#4B5563] max-w-xs mt-2">
            Fique atento ao ecrã. Quando um sorteio for ativado, leia o QR code para participar.
          </p>
        </main>
        <PageFooter />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <PageHeader />
      <main className="flex-1 flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-sm">
          <h1 className="text-3xl font-semibold tracking-tight text-[#0A0A0A] mb-2">Entrar no Lounge</h1>
          <p className="text-[#4B5563] mb-8 text-sm leading-relaxed">
            Regista-te para participares nos sorteios do ActivoBank Lounge.
          </p>

          {state === 'error' && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-6 text-sm">
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div>
              <label htmlFor="name" className="block text-xs font-medium text-[#4B5563] mb-1.5">Nome</label>
              <input id="name" type="text" required maxLength={100} value={name} onChange={e => setName(e.target.value)}
                placeholder="O teu nome"
                className="w-full bg-white border border-[#E5E7EB] rounded-lg px-4 py-3 text-[#0A0A0A] placeholder:text-gray-400 focus:outline-none focus:border-[#0096DC] focus:ring-2 focus:ring-[#0096DC]/20 transition" />
            </div>
            <div>
              <label htmlFor="phone" className="block text-xs font-medium text-[#4B5563] mb-1.5">Telemóvel</label>
              <input id="phone" type="tel" required maxLength={20} value={phone} onChange={e => setPhone(e.target.value)}
                placeholder="+351912345678"
                className="w-full bg-white border border-[#E5E7EB] rounded-lg px-4 py-3 text-[#0A0A0A] placeholder:text-gray-400 focus:outline-none focus:border-[#0096DC] focus:ring-2 focus:ring-[#0096DC]/20 transition" />
            </div>
            <div>
              <label htmlFor="email" className="block text-xs font-medium text-[#4B5563] mb-1.5">Email</label>
              <input id="email" type="email" required maxLength={200} value={email} onChange={e => setEmail(e.target.value)}
                placeholder="o.teu@email.com"
                className="w-full bg-white border border-[#E5E7EB] rounded-lg px-4 py-3 text-[#0A0A0A] placeholder:text-gray-400 focus:outline-none focus:border-[#0096DC] focus:ring-2 focus:ring-[#0096DC]/20 transition" />
            </div>
            <div className="flex items-start gap-3">
              <input
                id="consent"
                type="checkbox"
                required
                checked={consent}
                onChange={e => setConsent(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-[#E5E7EB] accent-[#0096DC] cursor-pointer"
              />
              <label htmlFor="consent" className="text-xs text-[#4B5563] leading-relaxed cursor-pointer">
                Aceito o tratamento dos meus dados pessoais nos termos da{' '}
                <a href="/privacidade" target="_blank" rel="noopener noreferrer" className="underline hover:text-[#0096DC]">
                  Política de Privacidade
                </a>
                .
              </label>
            </div>
            <button type="submit" disabled={state === 'loading' || !consent}
              className="mt-2 bg-[#0096DC] hover:bg-[#0064B4] text-white font-semibold text-base py-3.5 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
              {state === 'loading' ? 'A registar…' : 'Entrar no Lounge'}
            </button>
          </form>
        </div>
      </main>
      <PageFooter />
    </div>
  )
}
