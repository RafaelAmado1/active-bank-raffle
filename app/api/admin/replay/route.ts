import { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/require-admin'
import { supabaseAdmin } from '@/lib/supabase'
import { uuidRe } from '@/lib/uuid'

const schema = z.object({
  raffle_id: z.string().regex(uuidRe),
  label: z.string().min(1),
})

export async function POST(req: NextRequest) {
  const deny = await requireAdmin(req)
  if (deny) return deny

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return Response.json({ error: 'Payload inválido.' }, { status: 400 })

  const { raffle_id, label } = parsed.data

  await supabaseAdmin.channel('screen').send({
    type: 'broadcast',
    event: 'replay_winner',
    payload: { raffle_id, label },
  })

  return Response.json({ ok: true })
}
