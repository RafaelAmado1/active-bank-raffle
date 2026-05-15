import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/require-admin'
import { uuidRe } from '@/lib/uuid'
import type { RaffleParticipant } from '@/lib/types'

export async function GET(req: NextRequest) {
  const deny = await requireAdmin(req)
  if (deny) return deny

  const ids = req.nextUrl.searchParams.get('ids') ?? ''
  const idList = ids.split(',').map(s => s.trim()).filter(id => uuidRe.test(id))

  if (idList.length === 0) return Response.json({})
  if (idList.length > 20) {
    return Response.json({ error: 'Máximo de 20 IDs por pedido.' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('raffle_participants')
    .select('id, raffle_id, name, phone, registered_at')
    .in('raffle_id', idList)
    .order('registered_at', { ascending: false })

  if (error) {
    console.error('[participants/batch] GET error:', error.message)
    return Response.json({ error: 'Erro interno. Tenta de novo.' }, { status: 500 })
  }

  const result: Record<string, RaffleParticipant[]> = {}
  for (const p of data ?? []) {
    if (!result[p.raffle_id]) result[p.raffle_id] = []
    result[p.raffle_id].push(p as unknown as RaffleParticipant)
  }
  return Response.json(result)
}
