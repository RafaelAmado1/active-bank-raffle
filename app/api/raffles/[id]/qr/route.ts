import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { currentToken } from '@/lib/tokens'
import QRCode from 'qrcode'

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
