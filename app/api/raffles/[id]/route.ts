import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { pickWinner } from '@/lib/raffle'

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
