import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

// Dispara o workflow "Novo Post - Aprovação WhatsApp" no n8n depois que uma linha
// já foi inserida em post_queue (Sprint 2A).
//
// - status pending_approval: o n8n manda a foto+legenda pro Vagner aprovar via
//   WhatsApp ("SIM <id>"). Nada publica sem essa resposta.
// - status approved: só aceito se companies.auto_publish = true. O n8n pula o
//   WhatsApp e vai direto pro ramo de publicação (Marcar Aprovado → IG/FB). O
//   gate humano, nesse caso, é o modal "Publicar agora" do CRM.
//
// Sem segredo compartilhado nesta primeira versão (MVP): a segurança é (1)
// confirmar aqui que o post pertence à empresa do usuário autenticado antes de
// disparar, (2) conferir auto_publish pro caso approved, e (3) o n8n conferir
// auto_publish de novo antes de publicar direto.

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const startTime = Date.now()

  const jwt = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!jwt) return json({ error: 'Unauthorized' }, 401)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!

  const anonClient = createClient(supabaseUrl, supabaseAnonKey)
  const { data: { user } } = await anonClient.auth.getUser(jwt)
  if (!user) return json({ error: 'Unauthorized' }, 401)

  let postId: string | undefined
  try {
    const body = await req.json() as { postId?: string }
    postId = body.postId
  } catch {
    // body ausente ou inválido, tratado abaixo
  }

  if (!postId) return json({ error: 'postId obrigatório' }, 400)

  // Cliente com o JWT do próprio usuário: respeita RLS, então só enxerga o post
  // se ele pertencer à empresa do usuário autenticado (mesma proteção das outras
  // tabelas do CRM).
  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  })

  const { data: post, error: postError } = await userClient
    .from('post_queue')
    .select('id, status, company_id')
    .eq('id', postId)
    .single()

  if (postError || !post) {
    console.log(JSON.stringify({
      module: 'notify-post-queue',
      action: 'post_not_found',
      callerUserId: user.id,
      postId,
      durationMs: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    }))
    return json({ error: 'Post não encontrado' }, 404)
  }

  if (post.status === 'approved') {
    const { data: company, error: companyError } = await userClient
      .from('companies')
      .select('auto_publish')
      .eq('id', post.company_id)
      .single()

    if (companyError || company?.auto_publish !== true) {
      console.log(JSON.stringify({
        module: 'notify-post-queue',
        action: 'auto_publish_denied',
        callerUserId: user.id,
        companyId: post.company_id,
        postId: post.id,
        error: companyError?.message,
        timestamp: new Date().toISOString(),
      }))
      return json({ error: 'Publicação direta desativada para esta empresa' }, 403)
    }
  } else if (post.status !== 'pending_approval') {
    return json({ error: `Post já está em status "${post.status}"` }, 409)
  }

  const n8nWebhookUrl = Deno.env.get('N8N_NOVO_POST_WEBHOOK_URL')
    ?? 'https://n8n.senacorretor.com.br/webhook/novo-post'

  try {
    const n8nResponse = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postId: post.id, companyId: post.company_id }),
    })

    console.log(JSON.stringify({
      module: 'notify-post-queue',
      action: n8nResponse.ok ? 'n8n_notified' : 'n8n_error',
      callerUserId: user.id,
      companyId: post.company_id,
      postId: post.id,
      postStatus: post.status,
      n8nStatus: n8nResponse.status,
      durationMs: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    }))

    if (!n8nResponse.ok) return json({ error: 'Falha ao notificar o n8n' }, 502)
  } catch (error) {
    console.log(JSON.stringify({
      module: 'notify-post-queue',
      action: 'n8n_unreachable',
      callerUserId: user.id,
      companyId: post.company_id,
      postId: post.id,
      error: error instanceof Error ? error.message : String(error),
      durationMs: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    }))
    return json({ error: 'n8n indisponível' }, 502)
  }

  return json(
    { message: post.status === 'approved' ? 'Publicação iniciada' : 'Enviado para aprovação' },
    200,
  )
})
