import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('raffles')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}

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
