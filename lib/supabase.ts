import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { getEnv } from './env'

let _supabaseAdmin: SupabaseClient | null = null

function getAdmin(): SupabaseClient {
  if (!_supabaseAdmin) {
    const { NEXT_PUBLIC_SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: serviceKey } = getEnv()
    _supabaseAdmin = createClient(url, serviceKey, { auth: { persistSession: false } })
  }
  return _supabaseAdmin
}

export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    return Reflect.get(getAdmin(), prop, receiver)
  },
})

export type { Raffle, RaffleParticipant, LoungeEntrant } from './types'
