import { supabase } from '#/lib/supabase'
import { getSession } from '#/lib/auth'
import { DataLayerError } from '#/lib/errors'
import type { AiQualification } from '#/types/domain'
import type { Database } from '#/lib/database.types'

type AiScoreRow = Database['public']['Tables']['ai_scores']['Row']

function toAiQualification(row: AiScoreRow): AiQualification {
  return {
    id: row.id,
    leadId: row.lead_id,
    score: row.score,
    reasoning: row.reasoning,
    suggestedAction: row.suggested_action,
    generatedAt: row.generated_at,
  }
}

export async function qualifyLead(leadId: string): Promise<AiQualification> {
  const session = await getSession()
  if (!session?.access_token) throw new DataLayerError('ai.qualifyLead', 'Sessão inválida')

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
  const response = await fetch(`${supabaseUrl}/functions/v1/qualify-lead`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ leadId }),
  })

  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { error?: string }
    throw new DataLayerError('ai.qualifyLead', body.error ?? `HTTP ${response.status}`)
  }

  const data = await response.json() as { score: number; reasoning: string; suggested_action: string }
  return {
    id: crypto.randomUUID(),
    leadId,
    score: String(data.score),
    reasoning: data.reasoning,
    suggestedAction: data.suggested_action,
    generatedAt: new Date().toISOString(),
  }
}

export async function getLatestAiScore(leadId: string): Promise<AiQualification | null> {
  const { data, error } = await supabase
    .from('ai_scores')
    .select('*')
    .eq('lead_id', leadId)
    .order('generated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw new DataLayerError('ai.getLatestAiScore', error)
  return data ? toAiQualification(data) : null
}
