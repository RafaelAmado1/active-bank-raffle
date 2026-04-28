import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { validateToken } from '@/lib/tokens'

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
