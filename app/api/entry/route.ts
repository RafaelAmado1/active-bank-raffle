import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

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
