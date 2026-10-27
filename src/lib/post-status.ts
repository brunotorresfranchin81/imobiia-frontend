import type { Database } from './database.types'

type PostStatusSource = Pick<
  Database['public']['Tables']['post_queue']['Row'],
  'status' | 'ig_post_id' | 'fb_post_id' | 'error_message'
>

export type PostStatusTone = 'neutral' | 'progress' | 'success' | 'warning' | 'error'

export interface PostStatusView {
  label: string
  tone: PostStatusTone
  /** Motivo vindo de post_queue.error_message (falha, ou Instagram pulado). */
  detail: string | null
}

const IN_FLIGHT_STATUSES = new Set(['approved', 'publishing'])

/** Post aprovado que o n8n ainda está publicando — vale a pena reconsultar. */
export function isPostInFlight(status: string): boolean {
  return IN_FLIGHT_STATUSES.has(status)
}

/**
 * Traduz a linha de post_queue pro que o corretor vê no CRM, seguindo a
 * convenção do n8n: published + ig_post_id null + fb_post_id preenchido =
 * "saiu só no Facebook" (o motivo do Instagram vem em error_message).
 */
export function describePostStatus(post: PostStatusSource): PostStatusView {
  const detail = post.error_message?.trim() || null

  switch (post.status) {
    case 'pending_approval':
      return { label: 'Aguardando aprovação do Vagner', tone: 'neutral', detail: null }
    case 'approved':
    case 'publishing':
      return { label: 'Publicando...', tone: 'progress', detail: null }
    case 'published':
      if (!post.ig_post_id && post.fb_post_id) {
        return { label: 'Publicado só no Facebook', tone: 'warning', detail }
      }
      return { label: 'Publicado', tone: 'success', detail: null }
    case 'failed':
      return { label: 'Falhou', tone: 'error', detail: detail ?? 'Motivo não informado.' }
    case 'rejected':
      return { label: 'Rejeitado', tone: 'neutral', detail: null }
    default:
      return { label: post.status, tone: 'neutral', detail }
  }
}
