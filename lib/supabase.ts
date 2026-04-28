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
