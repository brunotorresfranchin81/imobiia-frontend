// verify_jwt = true — set via Supabase Dashboard › Functions › qualify-lead › Settings
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
      module: 'norma-ai-qualifier',
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

  const prompt = `Você é um especialista em qualificação de leads imobiliários.

Analise o seguinte lead e retorne um JSON com score, reasoning e suggested_action.

Lead:
- Nome: ${lead.full_name}
- Origem: ${lead.source ?? 'não informada'}
- Orçamento: ${budget}
- Bairros preferidos: ${neighborhoods}
- Status atual: ${lead.status ?? 'novo'}
- Notas: ${lead.notes ?? 'nenhuma'}

Critérios de score (0-100):
- Orçamento definido e realista: +30 pontos
- Bairros específicos definidos: +20 pontos
- Origem confiável (indicacao, site): +20 pontos
- Status avançado no funil: +20 pontos
- Notas com informações relevantes: +10 pontos

Retorne APENAS um JSON válido (sem markdown):
{"score": <número inteiro 0-100>, "reasoning": "<explicação em português>", "suggested_action": "<próxima ação recomendada em português>"}`

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
    console.log(JSON.stringify({
      module: 'norma-ai-qualifier',
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

  const rawText = aiData.content[0]?.text ?? ''
  const cleaned = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()

  let score: number
  let reasoning: string
  let suggested_action: string

  try {
    const parsed = JSON.parse(cleaned) as { score: number; reasoning: string; suggested_action: string }
    score = parsed.score
    reasoning = parsed.reasoning
    suggested_action = parsed.suggested_action
  } catch {
    console.log(JSON.stringify({
      module: 'norma-ai-qualifier',
      action: 'parse_error',
      leadId,
      rawText,
      durationMs: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    }))
    return new Response(JSON.stringify({ error: 'Erro ao processar resposta da IA' }), {
      status: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const tokensUsed = (aiData.usage?.input_tokens ?? 0) + (aiData.usage?.output_tokens ?? 0)

  const { error: insertError } = await adminClient
    .from('ai_scores')
    .insert({
      lead_id: leadId,
      company_id: callerCompanyId,
      score: String(score),
      reasoning,
      suggested_action,
    })

  if (insertError) {
    console.log(JSON.stringify({
      module: 'norma-ai-qualifier',
      action: 'insert_error',
      leadId,
      callerUserId: user.id,
      callerCompanyId,
      error: insertError.message,
      durationMs: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    }))
    return new Response(JSON.stringify({ error: 'Erro ao salvar qualificação' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  console.log(JSON.stringify({
    module: 'norma-ai-qualifier',
    action: 'qualify',
    leadId,
    callerUserId: user.id,
    callerCompanyId,
    score,
    tokensUsed,
    durationMs: Date.now() - startTime,
    timestamp: new Date().toISOString(),
  }))

  return new Response(JSON.stringify({ score, reasoning, suggested_action }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
