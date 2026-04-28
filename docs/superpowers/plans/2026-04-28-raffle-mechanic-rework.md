# Raffle Mechanic Rework Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the session-based rolling QR mechanic with an event-driven raffle system where raffles are activated on-demand by admin, each with its own QR, participant pool, duration, and winner.

**Architecture:** A new `raffles` table replaces the concept of drawing from session participants — each raffle is independent with its own QR token, duration, and participant list. The `/screen` page polls for active raffles and displays QR codes only when a raffle is live. The `/entry` page replaces `/register` as a permanent fixed-QR lounge check-in that stores participants globally. The `/admin` page manages raffle lifecycle: create with label + duration, watch participants join in real-time, then manually trigger the winner draw.

**Tech Stack:** Next.js 16 App Router, Supabase (Postgres + RLS), TypeScript, Tailwind CSS, qrcode npm package, Node.js crypto (HMAC tokens)

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `supabase/migrations/001_raffles.sql` | New DB schema: `raffles` + `raffle_participants` tables |
| Modify | `lib/supabase.ts` | Add `Raffle`, `RaffleParticipant` types |
| Modify | `lib/tokens.ts` | Token keyed on `raffle_id` instead of `session_id` |
| Delete | `app/api/sessions/route.ts` | Replaced by raffles |
| Delete | `app/api/draws/route.ts` | Replaced by raffles |
| Delete | `app/api/qr/route.ts` | Replaced by raffle-specific QR |
| Delete | `app/api/raffle/route.ts` | Replaced by raffles |
| Create | `app/api/raffles/route.ts` | GET list, POST create raffle |
| Create | `app/api/raffles/[id]/route.ts` | PATCH close/draw winner, GET single raffle |
| Create | `app/api/raffles/[id]/qr/route.ts` | GET QR for active raffle |
| Create | `app/api/raffles/[id]/participants/route.ts` | GET list, POST register participant |
| Modify | `app/screen/page.tsx` | Poll active raffles, show QR when live, idle state otherwise |
| Modify | `app/register/page.tsx` | Now `/entry` — fixed QR for lounge check-in (no raffle link) |
| Create | `app/entry/page.tsx` | Lounge entry form (name + phone + email, no token needed) |
| Modify | `app/admin/page.tsx` | Full rework: create raffles with label+duration, live participant list, draw winner |
| Modify | `app/page.tsx` | Redirect to `/screen` (was `/admin`) |

---

## Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/001_raffles.sql`

- [ ] **Step 1: Write migration SQL**

```sql
-- supabase/migrations/001_raffles.sql
create extension if not exists "pgcrypto";

-- Lounge entrants (permanent, not tied to a raffle)
create table if not exists lounge_entrants (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  phone        text not null,
  email        text not null,
  entered_at   timestamptz not null default now(),
  unique(phone)
);

-- Raffles — each activated moment is one raffle
create table if not exists raffles (
  id           uuid primary key default gen_random_uuid(),
  label        text not null,
  status       text not null default 'active' check (status in ('active', 'closed')),
  duration_sec int  not null default 120,
  starts_at    timestamptz not null default now(),
  ends_at      timestamptz,
  winner_id    uuid,
  created_at   timestamptz not null default now()
);

-- Participants per raffle
create table if not exists raffle_participants (
  id            uuid primary key default gen_random_uuid(),
  raffle_id     uuid not null references raffles(id) on delete cascade,
  name          text not null,
  phone         text not null,
  email         text not null,
  registered_at timestamptz not null default now(),
  unique(raffle_id, phone)
);

alter table raffles add constraint fk_raffle_winner
  foreign key (winner_id) references raffle_participants(id) on delete set null;

create index idx_raffle_participants_raffle on raffle_participants(raffle_id);
create index idx_raffles_status on raffles(status);

alter table lounge_entrants      enable row level security;
alter table raffles               enable row level security;
alter table raffle_participants   enable row level security;

create policy "service_role_all_lounge_entrants"    on lounge_entrants    for all using (true);
create policy "service_role_all_raffles"            on raffles            for all using (true);
create policy "service_role_all_raffle_participants" on raffle_participants for all using (true);
```

- [ ] **Step 2: Run migration in Supabase SQL Editor**

Copy the SQL above and run it in the Supabase dashboard SQL Editor. Verify the three new tables appear in the Table Editor: `lounge_entrants`, `raffles`, `raffle_participants`.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/001_raffles.sql
git commit -m "feat(db): add raffles, raffle_participants, lounge_entrants tables"
```

---

## Task 2: Update Types and Token Lib

**Files:**
- Modify: `lib/supabase.ts`
- Modify: `lib/tokens.ts`

- [ ] **Step 1: Replace `lib/supabase.ts` types**

Replace the entire file with:

```typescript
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const supabase = createClient(url, anonKey)
export const supabaseAdmin = createClient(url, serviceKey, {
  auth: { persistSession: false },
})

export type Raffle = {
  id: string
  label: string
  status: 'active' | 'closed'
  duration_sec: number
  starts_at: string
  ends_at: string | null
  winner_id: string | null
  created_at: string
}

export type RaffleParticipant = {
  id: string
  raffle_id: string
  name: string
  phone: string
  email: string
  registered_at: string
}

export type LoungeEntrant = {
  id: string
  name: string
  phone: string
  email: string
  entered_at: string
}
```

- [ ] **Step 2: Update `lib/tokens.ts` to key on raffle_id**

Replace the entire file with:

```typescript
import { createHmac } from 'crypto'

const SECRET = process.env.QR_SECRET!
const WINDOW_SECONDS = 120

function windowFor(timestamp: number): number {
  return Math.floor(timestamp / (WINDOW_SECONDS * 1000))
}

export function currentToken(raffleId: string): { token: string; expiresAt: number } {
  const now = Date.now()
  const window = windowFor(now)
  const token = makeToken(raffleId, window)
  const expiresAt = (window + 1) * WINDOW_SECONDS * 1000
  return { token, expiresAt }
}

export function validateToken(raffleId: string, token: string): boolean {
  const now = Date.now()
  const window = windowFor(now)
  const validTokens = [makeToken(raffleId, window)]
  const prevWindowEnd = window * WINDOW_SECONDS * 1000
  if (now - prevWindowEnd < 30_000) {
    validTokens.push(makeToken(raffleId, window - 1))
  }
  return validTokens.includes(token)
}

function makeToken(raffleId: string, window: number): string {
  return createHmac('sha256', SECRET)
    .update(`${raffleId}:${window}`)
    .digest('hex')
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/supabase.ts lib/tokens.ts
git commit -m "feat(lib): update types and token lib for raffle-based mechanic"
```

---

## Task 3: Raffle API Routes

**Files:**
- Create: `app/api/raffles/route.ts`
- Create: `app/api/raffles/[id]/route.ts`
- Create: `app/api/raffles/[id]/qr/route.ts`
- Create: `app/api/raffles/[id]/participants/route.ts`

- [ ] **Step 1: Create `app/api/raffles/route.ts`**

```typescript
import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// GET /api/raffles — list all raffles, newest first
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('raffles')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}

// POST /api/raffles — create and activate a new raffle
// Body: { label: string, duration_sec: number }
export async function POST(req: NextRequest) {
  const { label, duration_sec } = await req.json()
  if (!label?.trim()) return Response.json({ error: 'label required' }, { status: 400 })
  const duration = Number(duration_sec) || 120
  if (duration < 10 || duration > 3600) {
    return Response.json({ error: 'duration_sec must be 10–3600' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('raffles')
    .insert({ label: label.trim(), duration_sec: duration })
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data, { status: 201 })
}
```

- [ ] **Step 2: Create `app/api/raffles/[id]/route.ts`**

```typescript
import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { pickWinner } from '@/lib/raffle'

// GET /api/raffles/[id] — get single raffle with winner info
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { data, error } = await supabaseAdmin
    .from('raffles')
    .select('*, raffle_participants!raffles_winner_id_fkey(name, phone, email)')
    .eq('id', id)
    .single()
  if (error) return Response.json({ error: error.message }, { status: 404 })
  return Response.json(data)
}

// PATCH /api/raffles/[id] — close raffle and/or draw winner
// Body: { action: 'close' | 'draw' }
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { action } = await req.json()

  if (action === 'close') {
    const { data, error } = await supabaseAdmin
      .from('raffles')
      .update({ status: 'closed', ends_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json(data)
  }

  if (action === 'draw') {
    const { data: raffle, error: raffleErr } = await supabaseAdmin
      .from('raffles')
      .select('id, status')
      .eq('id', id)
      .single()
    if (raffleErr || !raffle) return Response.json({ error: 'Raffle not found' }, { status: 404 })
    if (raffle.status !== 'closed') {
      return Response.json({ error: 'Close the raffle before drawing a winner' }, { status: 400 })
    }

    const { data: participants, error: partErr } = await supabaseAdmin
      .from('raffle_participants')
      .select('*')
      .eq('raffle_id', id)
    if (partErr) return Response.json({ error: partErr.message }, { status: 500 })
    if (!participants || participants.length === 0) {
      return Response.json({ error: 'No participants in this raffle' }, { status: 400 })
    }

    const winner = pickWinner(participants)
    const { data, error } = await supabaseAdmin
      .from('raffles')
      .update({ winner_id: winner.id })
      .eq('id', id)
      .select()
      .single()
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ raffle: data, winner })
  }

  return Response.json({ error: 'action must be close or draw' }, { status: 400 })
}
```

- [ ] **Step 3: Create `app/api/raffles/[id]/qr/route.ts`**

```typescript
import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { currentToken } from '@/lib/tokens'
import QRCode from 'qrcode'

// GET /api/raffles/[id]/qr — get QR code for an active raffle
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const { data: raffle, error } = await supabaseAdmin
    .from('raffles')
    .select('id, label, status, duration_sec, starts_at')
    .eq('id', id)
    .single()

  if (error || !raffle) return Response.json({ error: 'Raffle not found' }, { status: 404 })
  if (raffle.status !== 'active') return Response.json({ error: 'Raffle is not active' }, { status: 410 })

  const { token, expiresAt } = currentToken(raffle.id)
  const registerUrl = `${process.env.NEXT_PUBLIC_APP_URL}/register?token=${token}&raffle_id=${raffle.id}`

  const qrDataUrl = await QRCode.toDataURL(registerUrl, {
    width: 600,
    margin: 2,
    color: { dark: '#1a1a2e', light: '#ffffff' },
    errorCorrectionLevel: 'M',
  })

  const endsAt = new Date(raffle.starts_at).getTime() + raffle.duration_sec * 1000

  return Response.json({
    raffle_id: raffle.id,
    label: raffle.label,
    token,
    expires_at: expiresAt,
    ends_at: endsAt,
    qr_data_url: qrDataUrl,
    register_url: registerUrl,
  })
}
```

- [ ] **Step 4: Create `app/api/raffles/[id]/participants/route.ts`**

```typescript
import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { validateToken } from '@/lib/tokens'

// GET /api/raffles/[id]/participants — list participants for a raffle
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { data, error } = await supabaseAdmin
    .from('raffle_participants')
    .select('*')
    .eq('raffle_id', id)
    .order('registered_at', { ascending: false })
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}

// POST /api/raffles/[id]/participants — register for a raffle
// Body: { name, phone, email, token }
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { name, phone, email, token } = await req.json()

  if (!name?.trim() || !phone?.trim() || !email?.trim() || !token) {
    return Response.json({ error: 'Missing fields' }, { status: 400 })
  }

  const { data: raffle, error: raffleErr } = await supabaseAdmin
    .from('raffles')
    .select('id, label, status')
    .eq('id', id)
    .single()

  if (raffleErr || !raffle) return Response.json({ error: 'Raffle not found' }, { status: 404 })
  if (raffle.status !== 'active') {
    return Response.json({ error: 'Este sorteio já encerrou.' }, { status: 410 })
  }

  if (!validateToken(id, token)) {
    return Response.json({ error: 'QR code expirado. Escaneia o código mais recente no ecrã.' }, { status: 422 })
  }

  const { data, error } = await supabaseAdmin
    .from('raffle_participants')
    .insert({ raffle_id: id, name: name.trim(), phone: phone.trim(), email: email.trim() })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return Response.json({ error: 'Já estás inscrito neste sorteio!' }, { status: 409 })
    }
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ ...data, raffle_label: raffle.label }, { status: 201 })
}
```

- [ ] **Step 5: Commit**

```bash
git add app/api/raffles/
git commit -m "feat(api): raffle CRUD, QR generation, participant registration"
```

---

## Task 4: Entry Page (Lounge Check-in)

**Files:**
- Create: `app/entry/page.tsx`

This is a fixed, permanent QR target — no token, no raffle link. Stores the visitor in `lounge_entrants`. Also needs a simple API route.

- [ ] **Step 1: Create `app/api/entry/route.ts`**

```typescript
import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// POST /api/entry — register a lounge entrant
export async function POST(req: NextRequest) {
  const { name, phone, email } = await req.json()
  if (!name?.trim() || !phone?.trim() || !email?.trim()) {
    return Response.json({ error: 'Missing fields' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('lounge_entrants')
    .upsert(
      { name: name.trim(), phone: phone.trim(), email: email.trim() },
      { onConflict: 'phone', ignoreDuplicates: false }
    )
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data, { status: 201 })
}
```

- [ ] **Step 2: Create `app/entry/page.tsx`**

```tsx
'use client'

import { useState, FormEvent } from 'react'

type State = 'idle' | 'loading' | 'success' | 'error'

export default function EntryPage() {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [state, setState] = useState<State>('idle')
  const [message, setMessage] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setState('loading')
    const res = await fetch('/api/entry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, phone, email }),
    })
    const data = await res.json()
    if (res.ok) {
      setState('success')
    } else {
      setMessage(data.error ?? 'Erro inesperado.')
      setState('error')
    }
  }

  if (state === 'success') {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <Header />
        <main className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <div className="w-16 h-16 rounded-full bg-[#0096DC]/10 flex items-center justify-center mb-6">
            <svg className="w-8 h-8 text-[#0096DC]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-3xl font-semibold text-[#0A0A0A] tracking-tight mb-2">Bem-vindo ao Lounge!</h1>
          <p className="text-sm text-[#6B7280] max-w-xs mt-2">
            Fique atento ao ecrã. Quando um sorteio for ativado, leia o QR code para participar.
          </p>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-sm">
          <h1 className="text-3xl font-semibold tracking-tight text-[#0A0A0A] mb-2">Entrar no Lounge</h1>
          <p className="text-[#6B7280] mb-8 text-sm leading-relaxed">
            Regista-te para participares nos sorteios da Fan Zone ActivoBank.
          </p>

          {state === 'error' && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-6 text-sm">
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div>
              <label htmlFor="name" className="block text-xs font-medium text-[#6B7280] mb-1.5">Nome</label>
              <input
                id="name" type="text" required value={name}
                onChange={e => setName(e.target.value)}
                placeholder="O teu nome"
                className="w-full bg-white border border-[#E5E7EB] rounded-lg px-4 py-3 text-[#0A0A0A] placeholder:text-gray-400 focus:outline-none focus:border-[#0096DC] focus:ring-2 focus:ring-[#0096DC]/20 transition"
              />
            </div>
            <div>
              <label htmlFor="phone" className="block text-xs font-medium text-[#6B7280] mb-1.5">Telemóvel</label>
              <input
                id="phone" type="tel" required value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+351 9XX XXX XXX"
                className="w-full bg-white border border-[#E5E7EB] rounded-lg px-4 py-3 text-[#0A0A0A] placeholder:text-gray-400 focus:outline-none focus:border-[#0096DC] focus:ring-2 focus:ring-[#0096DC]/20 transition"
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-xs font-medium text-[#6B7280] mb-1.5">Email</label>
              <input
                id="email" type="email" required value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="o.teu@email.com"
                className="w-full bg-white border border-[#E5E7EB] rounded-lg px-4 py-3 text-[#0A0A0A] placeholder:text-gray-400 focus:outline-none focus:border-[#0096DC] focus:ring-2 focus:ring-[#0096DC]/20 transition"
              />
            </div>
            <button
              type="submit"
              disabled={state === 'loading'}
              className="mt-2 bg-[#0096DC] hover:bg-[#0064B4] text-white font-semibold text-base py-3.5 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {state === 'loading' ? 'A registar…' : 'Entrar no Lounge'}
            </button>
          </form>

          <p className="text-xs text-[#6B7280] mt-6 leading-relaxed">
            Os dados serão usados apenas para contacto em caso de prémio. Tratamento conforme RGPD.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  )
}

function Header() {
  return (
    <header className="border-b border-[#E5E7EB] px-6 py-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo_activobank.svg" alt="ActivoBank" width={137} height={22} />
    </header>
  )
}

function Footer() {
  return (
    <footer className="border-t border-[#E5E7EB] px-6 py-4 text-center">
      <p className="text-xs text-[#6B7280]">ActivoBank · Fan Zone Mundial 2026</p>
    </footer>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add app/entry/page.tsx app/api/entry/route.ts
git commit -m "feat(entry): lounge check-in page and API route"
```

---

## Task 5: Register Page (Raffle Join)

**Files:**
- Modify: `app/register/page.tsx`

The `/register` page now reads `raffle_id` from query params instead of `session_id`, and posts to `/api/raffles/[id]/participants`.

- [ ] **Step 1: Replace `app/register/page.tsx`**

```tsx
'use client'

import { useSearchParams } from 'next/navigation'
import { useState, FormEvent, Suspense } from 'react'

type State = 'idle' | 'loading' | 'success' | 'error'

function RegisterForm() {
  const params = useSearchParams()
  const token = params.get('token') ?? ''
  const raffleId = params.get('raffle_id') ?? ''

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [state, setState] = useState<State>('idle')
  const [message, setMessage] = useState('')
  const [raffleLabel, setRaffleLabel] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setState('loading')
    const res = await fetch(`/api/raffles/${raffleId}/participants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, phone, email, token }),
    })
    const data = await res.json()
    if (res.ok) {
      setRaffleLabel(data.raffle_label)
      setState('success')
    } else {
      setMessage(data.error ?? 'Erro inesperado.')
      setState('error')
    }
  }

  if (!raffleId || !token) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center px-6 text-center">
          <p className="text-[#6B7280] text-sm">QR code inválido. Escaneia o código no ecrã.</p>
        </main>
        <Footer />
      </div>
    )
  }

  if (state === 'success') {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <Header />
        <main className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <div className="w-16 h-16 rounded-full bg-[#0096DC]/10 flex items-center justify-center mb-6">
            <svg className="w-8 h-8 text-[#0096DC]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-3xl font-semibold text-[#0A0A0A] tracking-tight mb-2">Inscrito!</h1>
          <p className="text-[#6B7280] mb-1">Sorteio</p>
          <p className="text-lg font-medium text-[#0A0A0A] mb-8">{raffleLabel}</p>
          <p className="text-sm text-[#6B7280] max-w-xs">
            Acompanha o ecrã. Caso sejas o vencedor, a equipa ActivoBank irá contactar-te.
          </p>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-sm">
          <h1 className="text-3xl font-semibold tracking-tight text-[#0A0A0A] mb-2">Participar no sorteio</h1>
          <p className="text-[#6B7280] mb-8 text-sm leading-relaxed">
            Preenche os teus dados para entrar no sorteio da Fan Zone ActivoBank.
          </p>

          {state === 'error' && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-6 text-sm">
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div>
              <label htmlFor="name" className="block text-xs font-medium text-[#6B7280] mb-1.5">Nome</label>
              <input id="name" type="text" required value={name} onChange={e => setName(e.target.value)}
                placeholder="O teu nome"
                className="w-full bg-white border border-[#E5E7EB] rounded-lg px-4 py-3 text-[#0A0A0A] placeholder:text-gray-400 focus:outline-none focus:border-[#0096DC] focus:ring-2 focus:ring-[#0096DC]/20 transition" />
            </div>
            <div>
              <label htmlFor="phone" className="block text-xs font-medium text-[#6B7280] mb-1.5">Telemóvel</label>
              <input id="phone" type="tel" required value={phone} onChange={e => setPhone(e.target.value)}
                placeholder="+351 9XX XXX XXX"
                className="w-full bg-white border border-[#E5E7EB] rounded-lg px-4 py-3 text-[#0A0A0A] placeholder:text-gray-400 focus:outline-none focus:border-[#0096DC] focus:ring-2 focus:ring-[#0096DC]/20 transition" />
            </div>
            <div>
              <label htmlFor="email" className="block text-xs font-medium text-[#6B7280] mb-1.5">Email</label>
              <input id="email" type="email" required value={email} onChange={e => setEmail(e.target.value)}
                placeholder="o.teu@email.com"
                className="w-full bg-white border border-[#E5E7EB] rounded-lg px-4 py-3 text-[#0A0A0A] placeholder:text-gray-400 focus:outline-none focus:border-[#0096DC] focus:ring-2 focus:ring-[#0096DC]/20 transition" />
            </div>
            <button type="submit" disabled={state === 'loading'}
              className="mt-2 bg-[#0096DC] hover:bg-[#0064B4] text-white font-semibold text-base py-3.5 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
              {state === 'loading' ? 'A inscrever…' : 'Entrar no sorteio'}
            </button>
          </form>

          <p className="text-xs text-[#6B7280] mt-6 leading-relaxed">
            Os dados serão usados apenas para contacto em caso de prémio. Tratamento conforme RGPD.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default function RegisterPage() {
  return <Suspense><RegisterForm /></Suspense>
}

function Header() {
  return (
    <header className="border-b border-[#E5E7EB] px-6 py-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo_activobank.svg" alt="ActivoBank" width={137} height={22} />
    </header>
  )
}

function Footer() {
  return (
    <footer className="border-t border-[#E5E7EB] px-6 py-4 text-center">
      <p className="text-xs text-[#6B7280]">ActivoBank · Fan Zone Mundial 2026</p>
    </footer>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/register/page.tsx
git commit -m "feat(register): switch to raffle_id-based registration flow"
```

---

## Task 6: Screen Page

**Files:**
- Modify: `app/screen/page.tsx`

Poll `/api/raffles` every 3s. When active raffles exist, show them with QR codes and countdowns. When none are active, show idle/waiting state with ActivoBank branding. When a raffle has a winner set, show winner overlay for 10s.

- [ ] **Step 1: Replace `app/screen/page.tsx`**

```tsx
'use client'

import { useEffect, useState, useCallback } from 'react'

type Raffle = {
  id: string
  label: string
  status: 'active' | 'closed'
  duration_sec: number
  starts_at: string
  ends_at: string | null
  winner_id: string | null
}

type RaffleQR = {
  raffle_id: string
  label: string
  ends_at: number
  qr_data_url: string
  register_url: string
}

type Winner = {
  raffle_id: string
  label: string
  name: string
  phone: string
}

export default function ScreenPage() {
  const [activeRaffles, setActiveRaffles] = useState<Raffle[]>([])
  const [qrMap, setQrMap] = useState<Record<string, RaffleQR>>({})
  const [winner, setWinner] = useState<Winner | null>(null)
  const [now, setNow] = useState(() => Date.now())

  // Clock tick
  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(iv)
  }, [])

  const fetchRaffles = useCallback(async () => {
    const res = await fetch('/api/raffles')
    if (!res.ok) return
    const all: Raffle[] = await res.json()
    const active = all.filter(r => r.status === 'active')
    setActiveRaffles(active)

    // Detect fresh winner in just-closed raffles
    const justClosed = all.find(r => r.status === 'closed' && r.winner_id && !winner)
    if (justClosed) {
      const detailRes = await fetch(`/api/raffles/${justClosed.id}`)
      if (detailRes.ok) {
        const detail = await detailRes.json()
        if (detail.raffle_participants) {
          setWinner({ raffle_id: justClosed.id, label: justClosed.label, ...detail.raffle_participants })
          setTimeout(() => setWinner(null), 12_000)
        }
      }
    }
  }, [winner])

  const fetchQRs = useCallback(async (raffles: Raffle[]) => {
    const entries = await Promise.all(
      raffles.map(async r => {
        const res = await fetch(`/api/raffles/${r.id}/qr`)
        if (!res.ok) return null
        const data: RaffleQR = await res.json()
        return [r.id, data] as const
      })
    )
    const map: Record<string, RaffleQR> = {}
    for (const entry of entries) {
      if (entry) map[entry[0]] = entry[1]
    }
    setQrMap(map)
  }, [])

  useEffect(() => {
    fetchRaffles()
    const iv = setInterval(fetchRaffles, 3000)
    return () => clearInterval(iv)
  }, [fetchRaffles])

  useEffect(() => {
    if (activeRaffles.length > 0) fetchQRs(activeRaffles)
  }, [activeRaffles, fetchQRs])

  if (winner) {
    return (
      <div className="min-h-screen bg-[#0096DC] flex flex-col text-white">
        <header className="px-8 py-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo_activobank.svg" alt="ActivoBank" width={137} height={22} className="brightness-0 invert" />
        </header>
        <main className="flex-1 flex flex-col items-center justify-center text-center px-8">
          <p className="text-sm font-medium tracking-[0.3em] uppercase opacity-80 mb-4">{winner.label}</p>
          <div className="text-6xl mb-6" aria-hidden>🏆</div>
          <h1 className="text-7xl sm:text-8xl font-semibold tracking-tight mb-3">{winner.name}</h1>
          <p className="text-2xl opacity-80 tabular-nums">{winner.phone}</p>
        </main>
        <footer className="px-8 py-4 text-center text-white/60 text-xs">Fan Zone · Mundial 2026</footer>
      </div>
    )
  }

  if (activeRaffles.length === 0) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <ScreenHeader />
        <main className="flex-1 flex flex-col items-center justify-center px-8 text-center">
          <div className="w-3 h-3 rounded-full bg-[#0096DC] mb-8 animate-pulse" />
          <h1 className="text-4xl font-semibold tracking-tight text-[#0A0A0A] mb-3">
            Os sorteios aparecem aqui
          </h1>
          <p className="text-[#6B7280] text-lg max-w-md">
            Quando um sorteio for ativado, o QR code aparece neste ecrã. Fique atento!
          </p>
        </main>
        <ScreenFooter />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <ScreenHeader />
      <main className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-2 gap-6 content-start max-w-7xl mx-auto w-full">
        {activeRaffles.map(raffle => {
          const qr = qrMap[raffle.id]
          const endsAt = qr?.ends_at ?? (new Date(raffle.starts_at).getTime() + raffle.duration_sec * 1000)
          const remaining = Math.max(0, Math.ceil((endsAt - now) / 1000))
          return (
            <div key={raffle.id} className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-sm flex flex-col items-center text-center">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-2 h-2 rounded-full bg-[#0096DC] animate-pulse" />
                <span className="text-xs font-medium text-[#0096DC] uppercase tracking-widest">Sorteio ativo</span>
              </div>
              <h2 className="text-3xl font-semibold tracking-tight text-[#0A0A0A] mb-5">{raffle.label}</h2>
              <div className="bg-[#F7F8FA] rounded-xl p-4 mb-4">
                {qr?.qr_data_url
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={qr.qr_data_url} alt="QR Code" className="w-56 h-56 sm:w-72 sm:h-72" />
                  : <div className="w-56 h-56 sm:w-72 sm:h-72 bg-[#E5E7EB] rounded-lg animate-pulse" />
                }
              </div>
              <p className="text-5xl font-semibold tabular-nums text-[#0096DC]">{remaining}s</p>
              <p className="text-xs text-[#6B7280] mt-1 uppercase tracking-wider">Tempo restante</p>
            </div>
          )
        })}
      </main>
      <ScreenFooter />
    </div>
  )
}

function ScreenHeader() {
  return (
    <header className="border-b border-[#E5E7EB] px-8 py-5 flex items-center justify-between">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo_activobank.svg" alt="ActivoBank" width={137} height={22} />
      <span className="text-xs text-[#6B7280] uppercase tracking-[0.2em]">Fan Zone · Mundial 2026</span>
    </header>
  )
}

function ScreenFooter() {
  return (
    <footer className="border-t border-[#E5E7EB] px-8 py-4 text-center">
      <p className="text-xs text-[#6B7280]">Sorteio promovido pelo ActivoBank · Participação gratuita</p>
    </footer>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/screen/page.tsx
git commit -m "feat(screen): poll active raffles, show QR + countdown per raffle, winner overlay"
```

---

## Task 7: Admin Page

**Files:**
- Modify: `app/admin/page.tsx`

Full rework. Keep PIN gate. Dashboard shows: list of active raffles (with live participant counts), form to create new raffle (label + duration), per-raffle close and draw-winner actions, history of closed raffles with winners.

- [ ] **Step 1: Replace `app/admin/page.tsx`**

Replace the entire file with the following (keep the existing PIN gate logic, replace Dashboard):

```tsx
'use client'

import { useState, useEffect, useCallback, useRef, FormEvent } from 'react'

type Raffle = {
  id: string
  label: string
  status: 'active' | 'closed'
  duration_sec: number
  starts_at: string
  ends_at: string | null
  winner_id: string | null
}

type Participant = {
  id: string
  raffle_id: string
  name: string
  phone: string
  email: string
  registered_at: string
}

type Toast = { id: number; kind: 'success' | 'info' | 'error'; text: string }

const CORRECT_PIN = process.env.NEXT_PUBLIC_ADMIN_PIN ?? '1234'
const MAX_PIN_ATTEMPTS = 5

const PRESETS = ['Golo', 'Intervalo', 'Penalty', 'Cartão', 'Final', 'Especial']

// ── PIN Gate ────────────────────────────────────────────────────────────────

function PinGate({ onUnlock }: { onUnlock: () => void }) {
  const [pin, setPin] = useState('')
  const [attempts, setAttempts] = useState(0)
  const [locked, setLocked] = useState(false)
  const [error, setError] = useState('')
  const [shake, setShake] = useState(false)

  const handleDigit = useCallback((d: string) => {
    if (locked || pin.length >= 4) return
    const next = pin + d
    setPin(next)
    if (next.length === 4) {
      if (next === CORRECT_PIN) {
        onUnlock()
      } else {
        const a = attempts + 1
        setAttempts(a)
        setShake(true)
        setTimeout(() => setShake(false), 400)
        if (a >= MAX_PIN_ATTEMPTS) {
          setLocked(true)
          setError('Muitas tentativas. Contacta o administrador.')
        } else {
          setError(`PIN incorrecto. ${MAX_PIN_ATTEMPTS - a} tentativa${MAX_PIN_ATTEMPTS - a === 1 ? '' : 's'} restante${MAX_PIN_ATTEMPTS - a === 1 ? '' : 's'}.`)
          setTimeout(() => setPin(''), 500)
        }
      }
    }
  }, [locked, pin, attempts, onUnlock])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key >= '0' && e.key <= '9') handleDigit(e.key)
      else if (e.key === 'Backspace') setPin(p => p.slice(0, -1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [handleDigit])

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="border-b border-[#E5E7EB] px-6 py-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo_activobank.svg" alt="ActivoBank" width={137} height={22} />
      </header>
      <main className="flex-1 flex flex-col items-center justify-center p-6">
        <div className={`w-full max-w-xs ${shake ? 'animate-shake' : ''}`}>
          <div className="text-center mb-8">
            <h1 className="text-2xl font-semibold tracking-tight text-[#0A0A0A]">Acesso Admin</h1>
            <p className="text-sm text-[#6B7280] mt-1.5">Introduz o PIN de 4 dígitos</p>
          </div>
          <div className="flex justify-center gap-3 mb-7">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className={`w-3.5 h-3.5 rounded-full transition-all duration-200 ${pin.length > i ? 'bg-[#0096DC] scale-110' : 'bg-[#E5E7EB]'}`} />
            ))}
          </div>
          {error && <p role="alert" className="text-red-600 text-sm mb-4 text-center font-medium">{error}</p>}
          <div className="grid grid-cols-3 gap-2.5">
            {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((d, i) => (
              <button key={i}
                onClick={() => d === '⌫' ? setPin(p => p.slice(0,-1)) : d && handleDigit(d)}
                disabled={locked || d === ''}
                className="h-14 rounded-xl bg-[#F7F8FA] hover:bg-[#EDEFF2] active:bg-[#E5E7EB] active:scale-95 text-xl font-medium text-[#0A0A0A] disabled:opacity-0 transition-all">
                {d}
              </button>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}

// ── Dashboard ────────────────────────────────────────────────────────────────

function Dashboard({ onLogout }: { onLogout: () => void }) {
  const [raffles, setRaffles] = useState<Raffle[]>([])
  const [participants, setParticipants] = useState<Record<string, Participant[]>>({})
  const [showCreate, setShowCreate] = useState(false)
  const [label, setLabel] = useState('')
  const [customLabel, setCustomLabel] = useState('')
  const [durationMin, setDurationMin] = useState('2')
  const [toasts, setToasts] = useState<Toast[]>([])
  const [drawingId, setDrawingId] = useState<string | null>(null)

  const pushToast = useCallback((kind: Toast['kind'], text: string) => {
    const id = Date.now() + Math.random()
    setToasts(t => [...t, { id, kind, text }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000)
  }, [])

  const fetchRaffles = useCallback(async () => {
    const res = await fetch('/api/raffles')
    if (res.ok) setRaffles(await res.json())
  }, [])

  const fetchParticipants = useCallback(async (raffleId: string) => {
    const res = await fetch(`/api/raffles/${raffleId}/participants`)
    if (res.ok) {
      const data: Participant[] = await res.json()
      setParticipants(p => ({ ...p, [raffleId]: data }))
    }
  }, [])

  useEffect(() => {
    fetchRaffles()
    const iv = setInterval(fetchRaffles, 4000)
    return () => clearInterval(iv)
  }, [fetchRaffles])

  useEffect(() => {
    const active = raffles.filter(r => r.status === 'active')
    active.forEach(r => fetchParticipants(r.id))
    if (active.length === 0) return
    const iv = setInterval(() => active.forEach(r => fetchParticipants(r.id)), 4000)
    return () => clearInterval(iv)
  }, [raffles, fetchParticipants])

  async function createRaffle(e: FormEvent) {
    e.preventDefault()
    const finalLabel = label || customLabel.trim()
    if (!finalLabel) return
    const duration_sec = Math.round(parseFloat(durationMin) * 60)
    const res = await fetch('/api/raffles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label: finalLabel, duration_sec }),
    })
    if (res.ok) {
      pushToast('success', `Sorteio "${finalLabel}" ativado`)
      setLabel('')
      setCustomLabel('')
      setShowCreate(false)
      fetchRaffles()
    } else {
      const d = await res.json()
      pushToast('error', d.error ?? 'Erro ao criar sorteio')
    }
  }

  async function closeRaffle(id: string) {
    const res = await fetch(`/api/raffles/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'close' }),
    })
    if (res.ok) { pushToast('info', 'Sorteio encerrado'); fetchRaffles() }
    else pushToast('error', 'Erro ao encerrar')
  }

  async function drawWinner(id: string, raffleLabel: string) {
    setDrawingId(id)
    const res = await fetch(`/api/raffles/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'draw' }),
    })
    setDrawingId(null)
    if (res.ok) {
      const d = await res.json()
      pushToast('success', `Vencedor de "${raffleLabel}": ${d.winner.name}`)
      fetchRaffles()
    } else {
      const d = await res.json()
      pushToast('error', d.error ?? 'Erro no sorteio')
    }
  }

  const activeRaffles = raffles.filter(r => r.status === 'active')
  const closedRaffles = raffles.filter(r => r.status === 'closed')

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      <header className="bg-white border-b border-[#E5E7EB] sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo_activobank.svg" alt="ActivoBank" width={137} height={22} />
          <div className="flex items-center gap-3">
            <a href="/screen" target="_blank" rel="noreferrer"
              className="text-xs font-medium text-[#0096DC] hover:text-[#0064B4] px-3 py-1.5 rounded-lg hover:bg-[#0096DC]/5 transition-colors">
              Ecrã TV
            </a>
            <button onClick={onLogout}
              className="text-xs text-[#6B7280] hover:text-[#0A0A0A] px-3 py-1.5 rounded-lg hover:bg-[#F7F8FA] transition-colors">
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* Create raffle */}
        <section className="bg-white border border-[#E5E7EB] rounded-2xl p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-[#0A0A0A]">Ativar sorteio</h2>
          </div>

          {!showCreate ? (
            <button onClick={() => setShowCreate(true)}
              className="w-full border-2 border-dashed border-[#E5E7EB] hover:border-[#0096DC] rounded-xl py-4 text-sm font-medium text-[#6B7280] hover:text-[#0096DC] transition-colors">
              + Novo sorteio
            </button>
          ) : (
            <form onSubmit={createRaffle} className="space-y-4">
              <div>
                <p className="text-xs font-medium text-[#6B7280] mb-2">Seleciona o momento</p>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {PRESETS.map(p => (
                    <button key={p} type="button" onClick={() => { setLabel(p); setCustomLabel('') }}
                      className={`py-2.5 px-2 rounded-xl border text-sm font-medium transition-all ${label === p ? 'border-[#0096DC] bg-[#0096DC]/5 text-[#0096DC]' : 'border-[#E5E7EB] text-[#0A0A0A] hover:border-[#0096DC]'}`}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#6B7280] mb-1.5">Ou personalizado</label>
                <input value={customLabel} onChange={e => { setCustomLabel(e.target.value); setLabel('') }}
                  placeholder="Ex: Primeiro canto…"
                  className="w-full bg-[#F7F8FA] border border-transparent rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:bg-white focus:border-[#0096DC] focus:ring-2 focus:ring-[#0096DC]/20 transition" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#6B7280] mb-1.5">Duração (minutos)</label>
                <input type="number" min="0.5" max="60" step="0.5" value={durationMin}
                  onChange={e => setDurationMin(e.target.value)}
                  className="w-32 bg-[#F7F8FA] border border-transparent rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:bg-white focus:border-[#0096DC] focus:ring-2 focus:ring-[#0096DC]/20 transition" />
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={!label && !customLabel.trim()}
                  className="bg-[#0096DC] hover:bg-[#0064B4] text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition-colors disabled:opacity-40">
                  Ativar
                </button>
                <button type="button" onClick={() => { setShowCreate(false); setLabel(''); setCustomLabel('') }}
                  className="text-sm text-[#6B7280] hover:text-[#0A0A0A] px-4 py-2.5 rounded-xl hover:bg-[#F7F8FA] transition-colors">
                  Cancelar
                </button>
              </div>
            </form>
          )}
        </section>

        {/* Active raffles */}
        {activeRaffles.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-sm font-semibold text-[#6B7280] uppercase tracking-wider px-1">Ativos</h2>
            {activeRaffles.map(r => {
              const parts = participants[r.id] ?? []
              return (
                <div key={r.id} className="bg-white border border-[#0096DC]/30 rounded-2xl p-5 sm:p-6">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#0096DC] animate-pulse flex-shrink-0" />
                      <h3 className="text-lg font-semibold text-[#0A0A0A]">{r.label}</h3>
                    </div>
                    <span className="text-2xl font-semibold tabular-nums text-[#0096DC]">{parts.length}</span>
                  </div>
                  <p className="text-xs text-[#6B7280] mb-4">
                    {parts.length === 0 ? 'Sem inscritos ainda' : `${parts.length} inscrito${parts.length === 1 ? '' : 's'}`}
                  </p>
                  {parts.length > 0 && (
                    <div className="border-t border-[#E5E7EB] max-h-40 overflow-y-auto mb-4">
                      <ul className="divide-y divide-[#E5E7EB]">
                        {parts.slice(0, 20).map(p => (
                          <li key={p.id} className="px-1 py-2 flex items-center justify-between text-sm">
                            <span className="font-medium text-[#0A0A0A]">{p.name}</span>
                            <span className="text-xs text-[#6B7280] tabular-nums">{p.phone}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <button onClick={() => closeRaffle(r.id)}
                    className="text-sm font-semibold px-4 py-2 rounded-xl bg-[#F7F8FA] hover:bg-[#E5E7EB] text-[#0A0A0A] transition-colors">
                    Encerrar sorteio
                  </button>
                </div>
              )
            })}
          </section>
        )}

        {/* Closed raffles — awaiting draw */}
        {closedRaffles.filter(r => !r.winner_id).length > 0 && (
          <section className="space-y-4">
            <h2 className="text-sm font-semibold text-[#6B7280] uppercase tracking-wider px-1">Encerrados — sem vencedor</h2>
            {closedRaffles.filter(r => !r.winner_id).map(r => {
              const parts = participants[r.id]
              return (
                <div key={r.id} className="bg-white border border-[#E5E7EB] rounded-2xl p-5 sm:p-6 flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-base font-semibold text-[#0A0A0A]">{r.label}</h3>
                    <p className="text-xs text-[#6B7280] mt-0.5">{parts ? `${parts.length} inscritos` : '…'}</p>
                  </div>
                  <button onClick={() => drawWinner(r.id, r.label)} disabled={drawingId === r.id}
                    className="bg-[#0096DC] hover:bg-[#0064B4] text-white font-semibold text-sm px-4 py-2.5 rounded-xl transition-colors disabled:opacity-60 whitespace-nowrap">
                    {drawingId === r.id ? 'A sortear…' : 'Sortear vencedor'}
                  </button>
                </div>
              )
            })}
          </section>
        )}

        {/* History */}
        {closedRaffles.filter(r => r.winner_id).length > 0 && (
          <section className="bg-white border border-[#E5E7EB] rounded-2xl p-5 sm:p-6">
            <h2 className="text-base font-semibold text-[#0A0A0A] mb-4">Histórico</h2>
            <ul className="divide-y divide-[#E5E7EB]">
              {closedRaffles.filter(r => r.winner_id).map(r => (
                <li key={r.id} className="py-3 flex items-center justify-between text-sm gap-3">
                  <span className="font-medium text-[#0A0A0A]">{r.label}</span>
                  <span className="text-[11px] text-[#6B7280] tabular-nums whitespace-nowrap">
                    {r.ends_at ? new Date(r.ends_at).toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {activeRaffles.length === 0 && raffles.length === 0 && (
          <section className="bg-white border border-[#E5E7EB] rounded-2xl p-10 text-center">
            <p className="text-[#6B7280] text-sm">Nenhum sorteio criado ainda. Usa o botão acima para ativar o primeiro.</p>
          </section>
        )}
      </main>

      {/* Toasts */}
      <div className="fixed top-20 right-4 z-50 space-y-2 pointer-events-none" aria-live="polite">
        {toasts.map(t => (
          <div key={t.id} className={`pointer-events-auto rounded-xl px-4 py-3 text-sm font-medium shadow-lg max-w-sm ${t.kind === 'success' ? 'bg-[#0096DC] text-white' : t.kind === 'error' ? 'bg-red-600 text-white' : 'bg-white border border-[#E5E7EB] text-[#0A0A0A]'}`}>
            {t.text}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function AdminPage() {
  const [unlocked, setUnlocked] = useState(false)
  return unlocked
    ? <Dashboard onLogout={() => setUnlocked(false)} />
    : <PinGate onUnlock={() => setUnlocked(true)} />
}
```

- [ ] **Step 2: Commit**

```bash
git add app/admin/page.tsx
git commit -m "feat(admin): rework for event-driven raffle management"
```

---

## Task 8: Delete Old API Routes + Update Root Redirect

**Files:**
- Delete: `app/api/sessions/route.ts`
- Delete: `app/api/draws/route.ts`
- Delete: `app/api/qr/route.ts`
- Delete: `app/api/raffle/route.ts`
- Modify: `app/page.tsx`

- [ ] **Step 1: Delete old routes**

```bash
rm app/api/sessions/route.ts
rm app/api/draws/route.ts
rm app/api/qr/route.ts
rm app/api/raffle/route.ts
```

- [ ] **Step 2: Update `app/page.tsx` to redirect to `/screen`**

```tsx
import { redirect } from 'next/navigation'

export default function Home() {
  redirect('/screen')
}
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: remove old session/draw/qr/raffle API routes, redirect / to /screen"
```

---

## Task 9: Build Check + Deploy

- [ ] **Step 1: Run local build**

```bash
npm run build
```

Expected: no TypeScript errors, all routes compile. Fix any type errors before continuing.

- [ ] **Step 2: Push and deploy**

```bash
git push pedrom main
```

Vercel will auto-deploy via the connected GitHub repo. Verify at https://active-bank-raffle.vercel.app that:
- `/screen` shows idle state when no raffles active
- `/admin` PIN gate works, can create raffle with label + duration
- After raffle created, `/screen` shows QR + countdown
- `/register?token=X&raffle_id=Y` accepts registration
- Admin can close raffle, then draw winner
- Winner appears on `/screen` for 12s
