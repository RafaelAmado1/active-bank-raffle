'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import type { Raffle, RaffleQR, Winner } from '@/lib/types'
import { usePolling } from '@/lib/hooks'

const TrophyCanvas = dynamic(() => import('./TrophyCanvas'), { ssr: false })

const screenSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

async function loadWinner(raffleId: string, label: string): Promise<Winner | null> {
  const res = await fetch(`/api/raffles/${raffleId}`)
  if (!res.ok) return null
  const detail = await res.json()
  if (!detail.raffle_participants) return null
  return { raffle_id: raffleId, label, ...detail.raffle_participants }
}

export default function ScreenPage() {
  const [activeRaffles, setActiveRaffles] = useState<Raffle[]>([])
  const [qrMap, setQrMap] = useState<Record<string, RaffleQR>>({})
  const [winner, setWinner] = useState<Winner | null>(null)
  const [offline, setOffline] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const shownWinners = useRef<Set<string>>(new Set())
  const winnerTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isFirstFetch = useRef(true)

  const showWinner = useCallback((w: Winner) => {
    if (winnerTimeout.current) clearTimeout(winnerTimeout.current)
    setWinner(w)
    winnerTimeout.current = setTimeout(() => setWinner(null), 15_000)
  }, [])

  // Listen for replay broadcasts from admin via Supabase Realtime
  useEffect(() => {
    const channel = screenSupabase
      .channel('screen')
      .on('broadcast', { event: 'replay_winner' }, async ({ payload }) => {
        if (payload?.raffle_id) {
          const w = await loadWinner(payload.raffle_id, payload.label ?? '')
          if (w) showWinner(w)
        }
      })
      .subscribe()
    return () => { screenSupabase.removeChannel(channel) }
  }, [showWinner])

  const fetchRaffles = useCallback(async () => {
    try {
      const res = await fetch('/api/raffles')
      if (!res.ok) { setOffline(true); return }
      setOffline(false)
      const all: Raffle[] = await res.json()
      setActiveRaffles(all.filter(r => r.status === 'active'))

      if (isFirstFetch.current) {
        all.forEach(r => { if (r.winner_id) shownWinners.current.add(r.id) })
        isFirstFetch.current = false
        return
      }

      const unseen = all.find(r => r.winner_id && !shownWinners.current.has(r.id))
      if (unseen) {
        shownWinners.current.add(unseen.id)
        const w = await loadWinner(unseen.id, unseen.label)
        if (w) showWinner(w)
      }
    } catch {
      setOffline(true)
    }
  }, [showWinner])

  const fetchQRs = useCallback(async (raffles: Raffle[]) => {
    const entries = await Promise.all(
      raffles.map(async r => {
        try {
          const res = await fetch(`/api/raffles/${r.id}/qr`)
          if (!res.ok) return null
          const data: RaffleQR = await res.json()
          return [r.id, data] as const
        } catch { return null }
      })
    )
    const map: Record<string, RaffleQR> = {}
    for (const entry of entries) { if (entry) map[entry[0]] = entry[1] }
    setQrMap(map)
  }, [])

  usePolling(fetchRaffles, 3000)

  useEffect(() => {
    if (activeRaffles.length > 0) fetchQRs(activeRaffles)
  }, [activeRaffles, fetchQRs])

  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(iv)
  }, [])

  const visibleRaffles = activeRaffles.filter(r => {
    const qr = qrMap[r.id]
    const endsAt = qr?.ends_at ?? (new Date(r.starts_at).getTime() + r.duration_sec * 1000)
    return now < endsAt
  })

  if (winner) return <WinnerScreen winner={winner} />

  if (visibleRaffles.length === 0) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <ScreenHeader offline={offline} />
        <main className="flex-1 flex flex-col items-center justify-center px-8 text-center">
          <div className="w-3 h-3 rounded-full bg-[#0096DC] mb-8 animate-pulse" />
          <h1 className="text-4xl font-semibold tracking-tight text-[#0A0A0A] mb-3">
            Os sorteios aparecem aqui
          </h1>
          <p className="text-[#4B5563] text-lg max-w-md">
            Quando um sorteio for ativado, o QR code aparece neste ecrã. Fique atento!
          </p>
        </main>
        <ScreenFooter />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <ScreenHeader offline={offline} />
      <main className="flex-1 p-6 flex flex-wrap items-center justify-center gap-6 max-w-7xl mx-auto w-full">
        {visibleRaffles.map(raffle => {
          const qr = qrMap[raffle.id]
          const endsAt = qr?.ends_at ?? (new Date(raffle.starts_at).getTime() + raffle.duration_sec * 1000)
          return <RaffleCard key={raffle.id} raffle={raffle} qr={qr} endsAt={endsAt} />
        })}
      </main>
      <ScreenFooter />
    </div>
  )
}

const PARTICLES = Array.from({ length: 22 }, (_, i) => ({
  id: i,
  x: Math.round(5 + (i * 4.3) % 90),
  size: 6 + (i * 7) % 14,
  delay: (i * 0.31) % 2.8,
  duration: 2.5 + (i * 0.17) % 2,
  color: i % 4 === 0 ? '#ffffff' : i % 4 === 1 ? '#FFD700' : i % 4 === 2 ? '#a8e6ff' : '#fff5cc',
  drift: -30 + (i * 13) % 60,
}))

function WinnerScreen({ winner }: { winner: Winner }) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setShow(true), 80)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="min-h-screen flex flex-col overflow-hidden relative" style={{ background: 'linear-gradient(135deg, #0064B4 0%, #0096DC 50%, #00B4F0 100%)' }}>

      {/* Radial glow behind name */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 55%, rgba(255,255,255,0.12) 0%, transparent 70%)' }} />

      {/* Animated particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
        {PARTICLES.map(p => (
          <div
            key={p.id}
            className="absolute rounded-full"
            style={{
              left: `${p.x}%`,
              bottom: '-20px',
              width: p.size,
              height: p.size,
              background: p.color,
              opacity: 0.7,
              animation: `floatUp ${p.duration}s ease-in ${p.delay}s infinite`,
              '--drift': `${p.drift}px`,
            } as React.CSSProperties}
          />
        ))}
      </div>

      {/* Pulsing ring behind name */}
      <div className="absolute pointer-events-none" style={{
        top: '52%', left: '50%',
        width: '700px', height: '700px',
        borderRadius: '50%',
        border: '2px solid rgba(255,255,255,0.15)',
        animation: 'pulse-ring 2.4s ease-out infinite',
      }} />
      <div className="absolute pointer-events-none" style={{
        top: '52%', left: '50%',
        width: '500px', height: '500px',
        borderRadius: '50%',
        border: '1px solid rgba(255,255,255,0.1)',
        animation: 'pulse-ring 2.4s ease-out 1.2s infinite',
      }} />

      {/* Header */}
      <header className="relative z-10 px-10 pt-8">
        <Image src="/logo_activobank.svg" alt="ActivoBank" width={148} height={24} className="brightness-0 invert opacity-90" priority />
      </header>

      {/* Main content */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-8">

        {/* VENCEDOR label */}
        <div style={{ opacity: show ? 1 : 0, transform: show ? 'translateY(0)' : 'translateY(20px)', transition: 'all 0.6s ease-out 0.15s' }}>
          <p className="text-4xl font-bold tracking-[0.3em] uppercase mb-3" style={{ color: 'rgba(255,255,255,0.55)' }}>
            Winner
          </p>
        </div>

        {/* Winner name — big and bold */}
        <div style={{ opacity: show ? 1 : 0, transform: show ? 'scale(1)' : 'scale(0.88)', transition: 'all 0.7s cubic-bezier(0.34,1.56,0.64,1) 0.25s' }}>
          <h1
            className="font-black tracking-tight leading-none text-white"
            style={{
              fontSize: 'clamp(4rem, 12vw, 10rem)',
              textShadow: '0 4px 40px rgba(0,0,0,0.25)',
              animation: show ? 'shimmer 3s ease-in-out infinite' : 'none',
            }}
          >
            {winner.name}
          </h1>
        </div>

        {/* Trophy 3D */}
        <div className="mt-6" aria-hidden>
          <TrophyCanvas />
        </div>

        {/* Phone */}
        {winner.phone && (
          <div style={{ opacity: show ? 1 : 0, transform: show ? 'translateY(0)' : 'translateY(12px)', transition: 'all 0.6s ease-out 0.4s' }}>
            <p className="text-xs font-semibold tracking-[0.3em] uppercase mt-5 mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>Phone Number</p>
            <p className="tabular-nums font-light" style={{ fontSize: 'clamp(1.2rem, 3vw, 2rem)', color: 'rgba(255,255,255,0.6)' }}>
              {winner.phone.slice(0, -4).replace(/\d/g, '*')}{winner.phone.slice(-4)}
            </p>
          </div>
        )}

        {/* Powered by */}
        <div className="flex flex-col items-center gap-2 mt-10" style={{ opacity: show ? 1 : 0, transition: 'opacity 0.6s ease-out 0.65s' }}>
          <p className="text-xs font-semibold tracking-[0.3em] uppercase" style={{ color: 'rgba(255,255,255,0.4)' }}>Powered by</p>
          <Image src="/logo_activobank.svg" alt="ActivoBank" width={110} height={18} className="brightness-0 invert opacity-60" />
        </div>
      </main>
    </div>
  )
}

function RaffleCard({ raffle, qr, endsAt }: { raffle: Raffle; qr: RaffleQR | undefined; endsAt: number }) {
  const [remaining, setRemaining] = useState(() => Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)))

  useEffect(() => {
    const iv = setInterval(() => {
      setRemaining(Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)))
    }, 1000)
    return () => clearInterval(iv)
  }, [endsAt])

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-sm flex flex-col items-center text-center">
      <div className="flex items-center gap-2 mb-4">
        <span className="w-2 h-2 rounded-full bg-[#0096DC] animate-pulse" />
        <span className="text-xs font-medium text-[#0096DC] uppercase tracking-widest">Sorteio ativo</span>
      </div>
      <h2 className="text-3xl font-semibold tracking-tight text-[#0A0A0A] mb-5">{raffle.label}</h2>
      <div className="bg-[#F7F8FA] rounded-xl p-4 mb-4 flex items-center justify-center">
        {qr?.qr_data_url
          ? <Image src={qr.qr_data_url} alt="QR Code para participar no sorteio" width={384} height={384} unoptimized className="w-80 h-80 sm:w-96 sm:h-96 block mx-auto" />
          : <div className="w-80 h-80 sm:w-96 sm:h-96 bg-[#E5E7EB] rounded-lg animate-pulse" />
        }
      </div>
      <p className="text-5xl font-semibold tabular-nums text-[#0096DC]">{remaining}s</p>
      <p className="text-xs text-[#4B5563] mt-1 uppercase tracking-wider">Tempo restante</p>
    </div>
  )
}

function ScreenHeader({ offline }: { offline?: boolean }) {
  return (
    <header className="border-b border-[#E5E7EB] px-8 py-5 flex items-center justify-between">
      <Image src="/logo_activobank.svg" alt="ActivoBank" width={137} height={22} priority />
      <div className="flex items-center gap-4">
        {offline && (
          <span className="text-xs font-medium text-red-600 bg-red-50 border border-red-200 px-2.5 py-1 rounded-lg">
            Sem ligação ao servidor
          </span>
        )}
        <span className="text-xs text-[#4B5563] uppercase tracking-[0.2em]">ActivoBank Lounge · {process.env.NEXT_PUBLIC_EVENT_LABEL ?? 'Mundial 2026'}</span>
      </div>
    </header>
  )
}

function ScreenFooter() {
  return (
    <footer className="border-t border-[#E5E7EB] px-8 py-4 text-center">
      <p className="text-xs text-[#4B5563]">Sorteio promovido pelo ActivoBank · Participação gratuita</p>
    </footer>
  )
}
