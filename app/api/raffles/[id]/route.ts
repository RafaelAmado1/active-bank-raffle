import { NextRequest } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase'
import { pickWinner } from '@/lib/raffle'
import { requireAdmin } from '@/lib/require-admin'
import { isAdminAuthenticated } from '@/lib/admin-auth'
import { audit } from '@/lib/audit'
import { getClientIp } from '@/lib/request-ip'
import { uuidRe } from '@/lib/uuid'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!uuidRe.test(id)) return Response.json({ error: 'ID inválido.' }, { status: 400 })

  const isAdmin = await isAdminAuthenticated(req)

  const { data: raffle, error } = await supabaseAdmin
    .from('raffles')
    .select('id, label, status, duration_sec, starts_at, ends_at, winner_id, created_at')
    .eq('id', id)
    .single()
  if (error || !raffle) {
    console.error('[raffles/id] GET error:', error?.message)
    return Response.json({ error: 'Sorteio não encontrado.' }, { status: 404 })
  }

  let winnerData: { name: string; phone?: string } | null = null
  if (raffle.winner_id) {
    const { data: participant } = await supabaseAdmin
      .from('raffle_participants')
      .select('name, phone')
      .eq('id', raffle.winner_id)
      .single()
    if (participant) {
      const phone = participant.phone ?? undefined
      winnerData = isAdmin
        ? { name: participant.name, phone }
        : { name: participant.name, phone: phone ? phone.slice(0, -4).replace(/\d/g, '*') + phone.slice(-4) : undefined }
    }
  }

  return Response.json({ ...raffle, raffle_participants: winnerData })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const deny = await requireAdmin(req)
  if (deny) return deny

  const { id } = await params
  if (!uuidRe.test(id)) return Response.json({ error: 'ID inválido.' }, { status: 400 })

  const ip = getClientIp(req)
  const body = await req.json().catch(() => null)
  const parsed = z.object({ action: z.enum(['close', 'draw']) }).safeParse(body)
  if (!parsed.success) return Response.json({ error: 'action deve ser close ou draw' }, { status: 400 })

  const { action } = parsed.data

  if (action === 'close') {
    const { data, error } = await supabaseAdmin
      .from('raffles')
      .update({ status: 'closed', ends_at: new Date().toISOString() })
      .eq('id', id)
      .select('id, label, status, duration_sec, starts_at, ends_at, winner_id, created_at')
      .single()
    if (error) {
      console.error('[raffles/id] close error:', error.message)
      return Response.json({ error: 'Erro interno. Tenta de novo.' }, { status: 500 })
    }
    audit({ event: 'raffle.closed', raffleId: id, ip })
    return Response.json(data)
  }

  // action === 'draw'
  const { data: raffle, error: raffleErr } = await supabaseAdmin
    .from('raffles')
    .select('id, status, winner_id')
    .eq('id', id)
    .single()
  if (raffleErr || !raffle) return Response.json({ error: 'Sorteio não encontrado.' }, { status: 404 })
  if (raffle.status !== 'active' && raffle.status !== 'closed') {
    return Response.json({ error: 'Sorteio não pode ser sorteado.' }, { status: 400 })
  }
  if (raffle.winner_id) {
    return Response.json({ error: 'Já existe um vencedor. Não é possível sortear novamente.' }, { status: 409 })
  }

  const { data: participants, error: partErr } = await supabaseAdmin
    .from('raffle_participants')
    .select('id, raffle_id, name, registered_at')
    .eq('raffle_id', id)
  if (partErr) {
    console.error('[raffles/id] draw participants error:', partErr.message)
    return Response.json({ error: 'Internal server error.' }, { status: 500 })
  }
  if (!participants || participants.length === 0) {
    return Response.json({ error: 'Nenhum participante inscrito neste sorteio.' }, { status: 400 })
  }

  const winner = pickWinner(participants)
  // Close and set winner atomically — works for both active and already-closed raffles
  const { data, error } = await supabaseAdmin
    .from('raffles')
    .update({ status: 'closed', ends_at: new Date().toISOString(), winner_id: winner.id })
    .eq('id', id)
    .select('id, label, status, duration_sec, starts_at, ends_at, winner_id, created_at')
    .single()
  if (error) {
    console.error('[raffles/id] draw winner error:', error.message)
    return Response.json({ error: 'Erro interno. Tenta de novo.' }, { status: 500 })
  }

  audit({ event: 'raffle.winner.selected', raffleId: id, winnerId: winner.id, totalParticipants: participants.length, ip })
  return Response.json({ raffle: data, winner })
}
