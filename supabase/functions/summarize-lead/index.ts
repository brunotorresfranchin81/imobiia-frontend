// verify_jwt = true — set via Supabase Dashboard › Functions › summarize-lead › Settings
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
  const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY')!

  if (!supabaseServiceRoleKey) {
    console.error(JSON.stringify({
      module: 'norma-ai-summarizer',
      action: 'fatal_missing_secret',
      missing: 'SUPABASE_SERVICE_ROLE_KEY',
      timestamp: new Date().toISOString(),
    }))
    return new Response(JSON.stringify({ error: 'Internal server error: missing service role key' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const anonClient = createClient(supabaseUrl, supabaseAnonKey)
  const { data: { user } } = await anonClient.auth.getUser(jwt)

  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey)

  let callerCompanyId = user.app_metadata?.company_id as string | undefined

  if (!callerCompanyId) {
    const { data: profile } = await adminClient
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()
    callerCompanyId = profile?.company_id as string | undefined
  }

  if (!callerCompanyId) {
    return new Response(JSON.stringify({ error: 'company_id não encontrado' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const { leadId } = await req.json() as { leadId: string }

  const { data: lead, error: leadError } = await adminClient
    .from('leads')
    .select('*')
    .eq('id', leadId)
    .single()

  if (leadError || !lead) {
    return new Response(JSON.stringify({ error: 'Lead não encontrado' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (lead.company_id !== callerCompanyId) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const fmt = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

  const budget =
    lead.budget_min != null && lead.budget_max != null
      ? `${fmt(lead.budget_min)} – ${fmt(lead.budget_max)}`
      : lead.budget_min != null
        ? `a partir de ${fmt(lead.budget_min)}`
        : lead.budget_max != null
          ? `até ${fmt(lead.budget_max)}`
          : 'não informado'

  const neighborhoods = Array.isArray(lead.preferred_neighborhoods) && lead.preferred_neighborhoods.length > 0
    ? (lead.preferred_neighborhoods as string[]).join(', ')
    : 'não informado'

  const prompt = `Você é um assistente imobiliário especialista em sintetizar informações de leads para corretores.

Escreva um resumo em português de 100 a 150 palavras sobre o lead abaixo, em texto corrido, sem títulos, sem markdown e sem listas. Não invente informações que não estejam presentes; quando um dado estiver ausente, indique isso explicitamente no texto.

Lead:
- Nome: ${lead.full_name}
- Origem: ${lead.source ?? 'não informada'}
- Orçamento: ${budget}
- Bairros preferidos: ${neighborhoods}
- Status atual: ${lead.status ?? 'novo'}
- Notas: ${lead.notes ?? 'nenhuma'}

Retorne APENAS o texto do resumo, sem aspas e sem formatação adicional.`

  const aiResponse = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': anthropicApiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5',
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!aiResponse.ok) {
    const errBody = await aiResponse.text()
    console.error(JSON.stringify({
      module: 'norma-ai-summarizer',
      action: 'ai_error',
      leadId,
      callerUserId: user.id,
      callerCompanyId,
      error: errBody,
      durationMs: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    }))
    return new Response(JSON.stringify({ error: 'Erro ao chamar IA' }), {
      status: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const aiData = await aiResponse.json() as {
    content: Array<{ type: string; text: string }>
    usage?: { input_tokens: number; output_tokens: number }
  }

  const content = (aiData.content[0]?.text ?? '').trim()

  if (!content) {
    console.error(JSON.stringify({
      module: 'norma-ai-summarizer',
      action: 'empty_response',
      leadId,
      durationMs: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    }))
    return new Response(JSON.stringify({ error: 'Erro ao processar resposta da IA' }), {
      status: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const tokensUsed = (aiData.usage?.input_tokens ?? 0) + (aiData.usage?.output_tokens ?? 0)

  const { data: summary, error: upsertError } = await adminClient
    .from('ai_summaries')
    .upsert(
      {
        lead_id: leadId,
        company_id: callerCompanyId,
        content,
        generated_at: new Date().toISOString(),
      },
      { onConflict: 'lead_id' }
    )
    .select('content, generated_at')
    .single()

  if (upsertError || !summary) {
    console.error(JSON.stringify({
      module: 'norma-ai-summarizer',
      action: 'upsert_error',
      leadId,
      callerUserId: user.id,
      callerCompanyId,
      error: upsertError?.message,
      durationMs: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    }))
    return new Response(JSON.stringify({ error: 'Erro ao salvar resumo' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  console.log(JSON.stringify({
    module: 'norma-ai-summarizer',
    action: 'summarize',
    leadId,
    callerUserId: user.id,
    callerCompanyId,
    tokensUsed,
    durationMs: Date.now() - startTime,
    timestamp: new Date().toISOString(),
  }))

  return new Response(JSON.stringify({ content: summary.content, generated_at: summary.generated_at }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
