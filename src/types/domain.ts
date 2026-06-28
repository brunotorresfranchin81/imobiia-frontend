export type AiScore = 'quente' | 'morno' | 'frio'

export interface AiQualification {
  id: string
  leadId: string
  score: AiScore
  reasoning: string
  suggestedAction: string
  generatedAt: string
}

export interface AiSummary {
  id: string
  leadId: string
  content: string
  generatedAt: string
}

export interface StatusHistoryEntry {
  id: string
  leadId: string
  oldStatus: string | null
  newStatus: string
  changedAt: string
  changedBy?: { id: string; full_name: string } | null
}

export interface CorretorProfile {
  id: string
  fullName: string
  role: 'corretor' | 'gestor' | 'admin'
  active: boolean
}
