import { supabase } from './supabase'
import { getAuthContext } from './auth'
import { DataLayerError } from './errors'
import type { Database } from './database.types'
import type { Property } from './properties'

export type PostQueueItem = Database['public']['Tables']['post_queue']['Row']

export interface CreateSocialPostInput {
  propertyId: string | null
  caption: string
  imageUrl: string
}

function toCamelCaseHashtagWord(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // remove acentos
    .replace(/[^a-zA-Z0-9\s]/g, '') // remove caracteres especiais
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('')
}

function capitalizeHashtagWord(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase()
}

type PropertyHashtagSource = Pick<Property, 'city' | 'neighborhood' | 'property_type' | 'operation_type'>

/**
 * Gera o bloco de hashtags dinâmicas do imóvel (Sprint 2A). Sempre calculado
 * a partir dos dados do próprio imóvel — nunca hardcoded, pois cada post
 * pode ser de cidade/bairro diferente.
 */
export function generatePropertyHashtags(property: PropertyHashtagSource): string {
  const tags = ['#SenaCorretorDeImóveis', '#imóveis']

  if (property.city) tags.push(`#${toCamelCaseHashtagWord(property.city)}`)
  if (property.neighborhood) tags.push(`#${toCamelCaseHashtagWord(property.neighborhood)}`)
  if (property.property_type) tags.push(`#${capitalizeHashtagWord(property.property_type)}`)
  if (property.operation_type) tags.push(`#${capitalizeHashtagWord(property.operation_type)}`)

  return tags.join(' ')
}

export function appendPropertyHashtags(caption: string, property: PropertyHashtagSource): string {
  const hashtags = generatePropertyHashtags(property)
  const trimmedCaption = caption.trim()
  return trimmedCaption ? `${trimmedCaption}\n\n${hashtags}` : hashtags
}

function formatAreaM2(value: number): string {
  return `${value.toLocaleString('pt-BR')}m²`
}

type PropertyCaptionSource = Property

/**
 * Monta a legenda completa do post (título + descrição + área + hashtags) a
 * partir dos dados do imóvel, pra o campo de legenda já vir pronto pra postar
 * sem edição manual (Sprint 2A).
 *
 * Não acrescenta endereço/preço/chamada fixos: a description cadastrada pelo
 * corretor já costuma trazer esse conteúdo formatado, e duplicar geraria
 * repetição no post. Só a área (que normalmente não vem na description) é
 * adicionada à parte.
 */
export function generatePropertyCaption(property: PropertyCaptionSource): string {
  const blocks: string[] = []

  if (property.title?.trim()) blocks.push(property.title.trim())

  if (property.description?.trim()) blocks.push(property.description.trim())

  if (property.area_m2 != null) blocks.push(`📐 ${formatAreaM2(Number(property.area_m2))}`)

  return appendPropertyHashtags(blocks.join('\n\n'), property)
}

const IN_PROGRESS_STATUSES = new Set(['pending_approval', 'approved', 'publishing'])

/**
 * Post idêntico (mesma empresa + legenda + foto) já existente em post_queue.
 * - in_progress: pending_approval/approved/publishing — não pode reenviar.
 * - published: já foi ao ar — só reenvia com confirmação do usuário.
 * - closed: rejected/failed — pode reenviar normalmente.
 */
export type DuplicatePost =
  | { kind: 'in_progress'; post: PostQueueItem }
  | { kind: 'published'; post: PostQueueItem; publishedAt: string }
  | { kind: 'closed'; post: PostQueueItem }

function formatPublishedAt(iso: string): string {
  const date = new Date(iso)
  const day = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  return `${day} às ${time}`
}

export function describeDuplicatePost(duplicate: DuplicatePost): string {
  switch (duplicate.kind) {
    case 'in_progress':
      return 'Este post já está aguardando aprovação/publicação.'
    case 'published':
      return `Este post já foi publicado em ${formatPublishedAt(duplicate.publishedAt)}.`
    case 'closed':
      return duplicate.post.status === 'rejected'
        ? 'Já existe um post idêntico que foi rejeitado.'
        : 'Já existe um post idêntico que falhou ao publicar.'
  }
}

export class DuplicatePostError extends Error {
  constructor(
    public readonly duplicate: DuplicatePost,
    message = describeDuplicatePost(duplicate),
  ) {
    super(message)
    this.name = 'DuplicatePostError'
  }
}

/**
 * Procura posts idênticos (mesma empresa + legenda + foto — os mesmos campos
 * do idempotency_hash) e devolve o mais relevante: um em andamento tem
 * prioridade sobre um publicado, que tem prioridade sobre rejected/failed.
 */
export async function findDuplicatePost(companyId: string, caption: string, imageUrl: string): Promise<DuplicatePost | null> {
  const { data, error } = await supabase
    .from('post_queue')
    .select('*')
    .eq('company_id', companyId)
    .eq('caption', caption)
    .eq('image_url', imageUrl)
    .order('created_at', { ascending: false })

  if (error) throw new DataLayerError('socialPosts.findDuplicate', error)
  if (!data?.length) return null

  const inProgress = data.find((post) => IN_PROGRESS_STATUSES.has(post.status))
  if (inProgress) return { kind: 'in_progress', post: inProgress }

  const published = data.find((post) => post.status === 'published')
  if (published) return { kind: 'published', post: published, publishedAt: published.published_at ?? published.created_at }

  return { kind: 'closed', post: data[0] }
}

/**
 * Insere a linha em post_queue (status inicial pending_approval) e avisa o n8n
 * via Edge Function, que envia a foto+legenda pro Vagner aprovar no WhatsApp
 * (Sprint 2A). Nada é publicado aqui — só entra na fila de aprovação.
 *
 * Antes de inserir, checa post idêntico: em andamento → DuplicatePostError;
 * já publicado → DuplicatePostError, a menos que `confirmRepublish` seja true;
 * rejected/failed → insere normalmente.
 */
export async function requestSocialPost(
  input: CreateSocialPostInput,
  options: { confirmRepublish?: boolean } = {},
): Promise<PostQueueItem> {
  const { companyId } = await getAuthContext()

  const duplicate = await findDuplicatePost(companyId, input.caption, input.imageUrl)
  if (duplicate?.kind === 'in_progress') throw new DuplicatePostError(duplicate)
  if (duplicate?.kind === 'published' && !options.confirmRepublish) throw new DuplicatePostError(duplicate)

  const { data, error } = await supabase
    .from('post_queue')
    .insert({
      company_id: companyId,
      property_id: input.propertyId,
      caption: input.caption,
      image_url: input.imageUrl,
    })
    .select()
    .single()

  if (error) {
    // 23505 = idempotency_hash único. Pode ser corrida (outro post entrou
    // entre a checagem e o insert) ou o índice ainda valer pra qualquer
    // status. Reconsulta pra explicar o caso real, nunca um texto genérico.
    if (error.code === '23505') {
      const current = await findDuplicatePost(companyId, input.caption, input.imageUrl)
      if (current?.kind === 'in_progress') throw new DuplicatePostError(current)
      if (current) {
        throw new DuplicatePostError(
          current,
          `${describeDuplicatePost(current)} O banco ainda não permite reenviar um post idêntico.`,
        )
      }
    }
    throw new DataLayerError('socialPosts.request', error)
  }

  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) {
    throw new DataLayerError('socialPosts.request', 'Sessão expirada')
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const response = await fetch(`${supabaseUrl}/functions/v1/notify-post-queue`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ postId: data.id }),
  })

  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { error?: string }
    throw new DataLayerError(
      'socialPosts.request',
      `Post criado, mas falhou ao avisar o n8n (HTTP_${response.status}: ${body.error ?? 'erro desconhecido'}). Ele continua pendente em post_queue.`,
    )
  }

  return data
}

export async function listPostQueueByProperty(propertyId: string): Promise<PostQueueItem[]> {
  const { data, error } = await supabase
    .from('post_queue')
    .select('*')
    .eq('property_id', propertyId)
    .order('created_at', { ascending: false })

  if (error) throw new DataLayerError('socialPosts.listByProperty', error)
  return data ?? []
}

export const POST_QUEUE_STATUS_LABELS: Record<string, string> = {
  pending_approval: 'Aguardando aprovação do Vagner',
  approved: 'Aprovado, publicando...',
  publishing: 'Publicando...',
  published: 'Publicado',
  failed: 'Falhou',
  rejected: 'Rejeitado',
}
