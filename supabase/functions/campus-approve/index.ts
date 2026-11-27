import { createClient } from 'npm:@supabase/supabase-js@2.119.2'

const site = Deno.env.get('CAMPUS_SITE_URL')
const url = Deno.env.get('SUPABASE_URL')
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

Deno.serve(async (request) => {
  const origin = request.headers.get('origin')
  const campusOrigin = site ? new URL(site).origin : undefined
  const headers = {
    'Access-Control-Allow-Origin': campusOrigin ?? 'null',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
    'Vary': 'Origin',
  }
  const respond = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers })
  if (origin && origin !== campusOrigin) return respond({ error: 'Origen no autorizado.' }, 403)
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers })
  if (request.method !== 'POST') return respond({ error: 'Método no permitido.' }, 405)
  if (!site || !url || !serviceKey) return respond({ error: 'Invitaciones sin configurar.' }, 503)

  const authorization = request.headers.get('authorization')
  if (!authorization?.startsWith('Bearer ')) return respond({ error: 'Inicia sesión.' }, 401)
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
  // The RPC and RLS use the caller's JWT. The server credential is only used by admin.auth.
  const caller = createClient(url, serviceKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: { user }, error: authError } = await admin.auth.getUser(authorization.slice(7))
  if (!user || authError) return respond({ error: 'Sesión inválida.' }, 401)
  const profile = await caller.rpc('current_campus_profile')
  if (profile.error || profile.data?.role !== 'admin') return respond({ error: 'Se requiere administración.' }, 403)

  const payload = await request.json().catch(() => null)
  const requestId = typeof payload?.requestId === 'string' && /^[1-9][0-9]{0,17}$/.test(payload.requestId) ? payload.requestId : null
  if (!requestId) return respond({ error: 'Solicitud inválida.' }, 400)
  const { data: access, error: accessError } = await caller.from('access_requests').select('id,email,status,requested_role').eq('id', requestId).maybeSingle()
  if (accessError || !access || !['pending', 'approved'].includes(access.status) || !['student', 'teacher', 'coordinator'].includes(access.requested_role)) {
    return respond({ error: 'Solicitud no disponible.' }, 409)
  }

  const prior = await admin.rpc('campus_invited_identity', { request_id: requestId })
  if (prior.error) return respond({ error: 'No se pudo comprobar la invitación.' }, 502)
  let invitedUser = prior.data
  if (!invitedUser) {
    const redirectTo = new URL('/acceso?activar=1', site).href
    const invitation = await admin.auth.admin.inviteUserByEmail(access.email, { redirectTo })
    if (invitation.error || !invitation.data.user) return respond({ error: 'No se pudo enviar el correo de invitación.' }, 502)
    invitedUser = invitation.data.user.id
  }

  const { data, error } = await caller.rpc('finalize_campus_request', { request_id: requestId, invited_user: invitedUser })
  if (error || !data) return respond({ error: 'La solicitud no quedó aprobada. Vuelve a intentar desde el campus.' }, 409)
  return respond(data)
})
