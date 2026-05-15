import { NextRequest } from 'next/server'
import { z } from 'zod'
import { signAdminToken, ADMIN_COOKIE } from '@/lib/admin-auth'
import { checkRateLimit } from '@/lib/rate-limit'
import { audit } from '@/lib/audit'
import { getEnv } from '@/lib/env'
import { getClientIp } from '@/lib/request-ip'

const schema = z.object({ pin: z.string().min(1) })

export async function POST(req: NextRequest) {
  const ip = getClientIp(req)

  const allowed = await checkRateLimit(`admin-login:${ip}`, 10, 900)
  if (!allowed) {
    audit({ event: 'rate_limit.exceeded', endpoint: 'admin.login', ip })
    return Response.json({ error: 'Demasiadas tentativas. Tenta mais tarde.' }, { status: 429 })
  }

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: 'Formato de PIN inválido.' }, { status: 400 })
  }

  if (parsed.data.pin !== getEnv().ADMIN_PIN) {
    audit({ event: 'admin.login.failure', ip })
    return Response.json({ error: 'PIN incorrecto.' }, { status: 401 })
  }

  audit({ event: 'admin.login.success', ip })
  const token = await signAdminToken()

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': [
        `${ADMIN_COOKIE}=${token}`,
        'HttpOnly',
        'Secure',
        'SameSite=Strict',
        'Path=/',
        'Max-Age=7200',
      ].join('; '),
    },
  })
}
