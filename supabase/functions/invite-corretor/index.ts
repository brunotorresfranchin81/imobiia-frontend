import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const startTime = Date.now()

  const jwt = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!jwt) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  const anonClient = createClient(supabaseUrl, supabaseAnonKey)
  const { data: { user } } = await anonClient.auth.getUser(jwt)

  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const callerRole = user.app_metadata?.role as string | undefined
  const callerCompanyId = user.app_metadata?.company_id as string | undefined

  if (callerRole !== 'admin' && callerRole !== 'gestor') {
    console.log(JSON.stringify({
      module: 'invite-corretor',
      action: 'permission_denied',
      callerUserId: user.id,
      callerRole,
      callerCompanyId,
      targetEmail: null,
      durationMs: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    }))
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const { email, fullName } = await req.json() as { email: string; fullName: string }

  const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey)

  const { error } = await adminClient.auth.admin.inviteUserByEmail(email, {
    data: {
      full_name: fullName,
      company_id: callerCompanyId,
      role: 'corretor',
    },
  })

  if (error) {
    const status = (error as { status?: number }).status === 422 ? 409 : 500
    console.log(JSON.stringify({
      module: 'invite-corretor',
      action: 'invite_error',
      callerUserId: user.id,
      callerRole,
      callerCompanyId,
      targetEmail: email,
      durationMs: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    }))
    return new Response(JSON.stringify({ error: error.message }), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  console.log(JSON.stringify({
    module: 'invite-corretor',
    action: 'invite_success',
    callerUserId: user.id,
    callerRole,
    callerCompanyId,
    targetEmail: email,
    durationMs: Date.now() - startTime,
    timestamp: new Date().toISOString(),
  }))

  return new Response(JSON.stringify({ message: 'Convite enviado com sucesso' }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
