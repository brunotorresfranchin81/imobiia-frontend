import { supabase } from './supabase'
import { getAuthContext } from './auth'
import { DataLayerError } from './errors'
import type { Database } from './database.types'
import type { Property } from './properties'

export type PostQueueItem = Database['public']['Tables']['post_queue']['Row']

/**
 * Erro do Supabase (PostgrestError não é instanceof Error) vira Error com o
 * texto real. Sem isso a tela mostrava "[object Object]".
 */
function toError(error: unknown): Error {
  if (error instanceof Error) return error
  const message = (error as { message?: string } | null)?.message
  return new Error(message ?? JSON.stringify(error))
}

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

  if (error) throw toError(error)
  if (!data?.length) return null

  const inProgress = data.find((post) => IN_PROGRESS_STATUSES.has(post.status))
  if (inProgress) return { kind: 'in_progress', post: inProgress }

  const published = data.find((post) => post.status === 'published')
  if (published) return { kind: 'published', post: published, publishedAt: published.published_at ?? published.created_at }

  return { kind: 'closed', post: data[0] }
}

/**
 * Lê companies.auto_publish da empresa do usuário. true = o post sai direto do
 * CRM (após confirmação no modal), sem o "SIM" do Vagner no WhatsApp.
 */
export async function getCompanyAutoPublish(): Promise<boolean> {
  const { companyId } = await getAuthContext()

  const { data, error } = await supabase
    .from('companies')
    .select('auto_publish')
    .eq('id', companyId)
    .single()

  if (error) {
    // 42703 = coluna ainda não existe (front publicado antes da migração):
    // mantém o fluxo de aprovação por WhatsApp, que é o comportamento antigo.
    if (error.code === '42703') return false
    throw toError(error)
  }
  return data.auto_publish === true
}

/**
 * A empresa publica direto, mas a chamada não veio do modal "Publicar agora".
 * Garante que nunca sai um post sem o usuário ter visto foto + legenda.
 */
export class AutoPublishConfirmationRequiredError extends Error {
  constructor() {
    super('Confirme a publicação antes de enviar: esta empresa publica direto, sem aprovação pelo WhatsApp.')
    this.name = 'AutoPublishConfirmationRequiredError'
  }
}

export interface RequestSocialPostResult {
  post: PostQueueItem
  /** true = entrou como approved e o n8n já está publicando. */
  autoPublished: boolean
}

/**
 * Insere a linha em post_queue e avisa o n8n via Edge Function
 * notify-post-queue (Sprint 2A).
 *
 * - companies.auto_publish=false: entra como pending_approval e o n8n manda
 *   foto+legenda pro Vagner aprovar no WhatsApp. Nada é publicado aqui.
 * - companies.auto_publish=true: exige `confirmedAutoPublish` (modal do CRM),
 *   entra já como approved e o n8n segue direto pro mesmo ramo de publicação
 *   do "SIM" (Marcar Aprovado → IG/FB → aviso ao Vagner).
 *
 * Antes de inserir, checa post idêntico: em andamento → DuplicatePostError;
 * já publicado → DuplicatePostError, a menos que `confirmRepublish` seja true;
 * rejected/failed → insere normalmente.
 */
export async function requestSocialPost(
  input: CreateSocialPostInput,
  options: { confirmRepublish?: boolean; confirmedAutoPublish?: boolean } = {},
): Promise<RequestSocialPostResult> {
  const { companyId } = await getAuthContext()

  const duplicate = await findDuplicatePost(companyId, input.caption, input.imageUrl)
  if (duplicate?.kind === 'in_progress') throw new DuplicatePostError(duplicate)
  if (duplicate?.kind === 'published' && !options.confirmRepublish) throw new DuplicatePostError(duplicate)

  const autoPublish = await getCompanyAutoPublish()
  if (autoPublish && !options.confirmedAutoPublish) throw new AutoPublishConfirmationRequiredError()

  const { data, error } = await supabase
    .from('post_queue')
    .insert({
      company_id: companyId,
      property_id: input.propertyId,
      caption: input.caption,
      image_url: input.imageUrl,
      ...(autoPublish ? { status: 'approved', approved_at: new Date().toISOString() } : {}),
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
    throw toError(error)
  }

  const notifyError = await notifyPostQueue(data.id)
  if (notifyError) {
    if (autoPublish) {
      // Sem o n8n o post ficaria "approved" pra sempre e bloquearia o reenvio.
      // Marca como failed pra liberar uma nova tentativa e mostrar o motivo.
      const message = `Não foi possível iniciar a publicação: ${notifyError}`
      await supabase.from('post_queue').update({ status: 'failed', error_message: message }).eq('id', data.id)
      throw new Error(`${message}. Nada foi publicado; tente de novo.`)
    }
    throw new Error(`Post criado, mas falhou ao avisar o n8n (${notifyError}). Ele continua pendente em post_queue.`)
  }

  return { post: data, autoPublished: autoPublish }
}

/** Chama a Edge Function notify-post-queue. Devolve o motivo da falha, ou null. */
async function notifyPostQueue(postId: string): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) return 'sessão expirada'

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/notify-post-queue`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ postId }),
    })
    if (response.ok) return null
    const body = await response.json().catch(() => ({})) as { error?: string }
    return `HTTP_${response.status}: ${body.error ?? 'erro desconhecido'}`
  } catch (err) {
    return err instanceof Error ? err.message : 'erro de rede'
  }
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
