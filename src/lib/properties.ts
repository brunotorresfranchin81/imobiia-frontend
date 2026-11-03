import { supabase } from './supabase'
import { getAuthContext } from './auth'
import { DataLayerError } from './errors'
import { isForaDoSite, isSituacaoPermitida } from './property-situacao'
import type { Database } from './database.types'

export type Property = Database['public']['Tables']['properties']['Row']
export type PropertyType = Database['public']['Enums']['property_type']
export type PropertyStatus = Database['public']['Enums']['property_status']
export type OperationType = Database['public']['Enums']['property_intent']

export type PropertyFormData = {
  title: string
  description?: string | null
  address: string
  neighborhood?: string | null
  city?: string | null
  state?: string | null
  zip_code?: string | null
  property_type: PropertyType
  /** Fora do formulário: a Situação muda pela caixinha (setPropertySituacao). */
  status?: PropertyStatus
  area_m2?: number | null
  price: number
  condominio_valor?: number | null
  iptu_valor?: number | null
  bedrooms?: number | null
  bathrooms?: number | null
  suites?: number | null
  parking_spots?: number | null
  published?: boolean
  featured?: boolean
  slug?: string | null
  operation_type?: OperationType | null
}

export function generateSlug(title: string): string {
  return title
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export async function listProperties(): Promise<Property[]> {
  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw new DataLayerError('properties.list', error)
  return data ?? []
}

export async function getPropertyById(id: string): Promise<Property> {
  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw new DataLayerError('properties.getById', error)
  return data
}

export async function createProperty(formData: PropertyFormData): Promise<Property> {
  const { userId, companyId } = await getAuthContext()

  const { data, error } = await supabase
    .from('properties')
    .insert({
      ...formData,
      reference_code: `IMO-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
      company_id: companyId,
      created_by: userId,
    })
    .select()
    .single()

  if (error) throw new DataLayerError('properties.create', error)
  return data
}

export async function updateProperty(id: string, formData: PropertyFormData): Promise<Property> {
  const { data, error } = await supabase
    .from('properties')
    .update({ ...formData, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw new DataLayerError('properties.update', error)
  return data
}

/**
 * Muda a Situação. Só arquivado tira do site (published=false); vendido/alugado
 * e a volta pra disponível/em negociação não mexem em published nem featured.
 */
export async function setPropertySituacao(
  property: Pick<Property, 'id' | 'operation_type'>,
  situacao: PropertyStatus,
): Promise<Property> {
  if (!isSituacaoPermitida(situacao, property.operation_type)) {
    throw new DataLayerError(
      'properties.situacao',
      situacao === 'vendido'
        ? 'Só imóvel de venda pode ficar como Vendido.'
        : 'Só imóvel de aluguel pode ficar como Alugado.',
    )
  }

  const { data, error } = await supabase
    .from('properties')
    .update({
      status: situacao,
      ...(isForaDoSite(situacao) ? { published: false, featured: false } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq('id', property.id)
    .select()
    .single()

  if (error) throw new DataLayerError('properties.situacao', error)
  return data
}

const PROPERTIES_BUCKET = 'imobiia-properties'

/**
 * "Excluir de vez" (só admin): guarda os caminhos das fotos, apaga a linha em
 * properties e só então os arquivos do bucket. property_images, price_history,
 * visits e lead_properties caem por cascade; post_queue fica com property_id
 * null (os posts já feitos no IG/FB continuam no ar).
 *
 * Falha no banco = erro (nada apagado). Falha no bucket = `warning`, porque o
 * imóvel já foi excluído e só sobram arquivos órfãos.
 */
export async function deletePropertyPermanently(id: string): Promise<{ warning: string | null }> {
  const { role, companyId } = await getAuthContext()
  if (role !== 'admin') {
    throw new DataLayerError('properties.delete', 'Só o administrador da empresa pode excluir um imóvel de vez.')
  }

  // 1. Fotos: as registradas em property_images + o que sobrou na pasta do imóvel.
  const { data: imageRows, error: imagesError } = await supabase
    .from('property_images')
    .select('storage_path')
    .eq('property_id', id)
  if (imagesError) throw new DataLayerError('properties.delete', imagesError)

  const folder = `${companyId}/${id}`
  const listFolder = async () => {
    const { data, error } = await supabase.storage.from(PROPERTIES_BUCKET).list(folder, { limit: 1000 })
    if (error) {
      console.error('[properties.delete] erro ao listar fotos:', error)
      return []
    }
    return (data ?? []).map((file) => `${folder}/${file.name}`)
  }

  const paths = [...new Set([...(imageRows ?? []).map((row) => row.storage_path), ...(await listFolder())])]

  // 2. A linha primeiro: se o banco recusar, nada foi apagado (fotos intactas).
  // Sem policy de DELETE a RLS filtra em silêncio (0 linhas, sem erro).
  const { data: deleted, error } = await supabase
    .from('properties')
    .delete()
    .eq('id', id)
    .select('id')

  if (error) {
    if (error.code === '23503') {
      throw new DataLayerError(
        'properties.delete',
        `O imóvel ainda está vinculado a outros registros (${error.details ?? error.message}) e não pôde ser excluído.`,
      )
    }
    if (error.code === '42501') {
      throw new DataLayerError('properties.delete', 'Sem permissão para excluir este imóvel.')
    }
    throw new DataLayerError('properties.delete', error)
  }
  if (!deleted?.length) {
    throw new DataLayerError(
      'properties.delete',
      'O banco não permitiu excluir o imóvel (sem permissão ou ele não existe mais).',
    )
  }

  // 3. Arquivos do bucket. O imóvel já não existe: falha aqui vira só aviso
  // (sobram arquivos órfãos no storage), nunca erro.
  if (paths.length === 0) return { warning: null }

  const { error: removeError } = await supabase.storage.from(PROPERTIES_BUCKET).remove(paths)
  const remaining = removeError ? paths : await listFolder()
  if (removeError || remaining.length > 0) {
    console.error('[properties.delete] fotos não apagadas do bucket:', removeError ?? remaining)
    return {
      warning: `Imóvel excluído, mas ${remaining.length} foto(s) não puderam ser apagadas do armazenamento.`,
    }
  }
  return { warning: null }
}

export interface PropertyImage {
  id: string
  propertyId: string
  companyId: string
  storagePath: string
  url: string
  isMain: boolean
  displayOrder: number
  createdAt: string
}

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE_MB = 5

export async function listPropertyImages(propertyId: string): Promise<PropertyImage[]> {
  const { data, error } = await supabase
    .from('property_images')
    .select('*')
    .eq('property_id', propertyId)
    .order('display_order', { ascending: true })
  if (error) throw new DataLayerError('properties.images.list', error)
  return (data ?? []).map(row => ({
    id: row.id,
    propertyId: row.property_id,
    companyId: row.company_id,
    storagePath: row.storage_path,
    url: row.url,
    isMain: row.is_main,
    displayOrder: row.display_order,
    createdAt: row.created_at,
  }))
}

export async function uploadPropertyImage(
  propertyId: string,
  file: File,
  currentCount: number
): Promise<PropertyImage> {
  if (currentCount >= 20) throw new DataLayerError('properties.images.upload', 'Máximo de 20 fotos por imóvel')
  if (!ACCEPTED_TYPES.includes(file.type)) throw new DataLayerError('properties.images.upload', 'Tipo de arquivo não permitido. Use JPG, PNG ou WebP')
  if (file.size > MAX_SIZE_MB * 1024 * 1024) throw new DataLayerError('properties.images.upload', `Arquivo muito grande. Máximo ${MAX_SIZE_MB}MB`)

  const { companyId } = await getAuthContext()
  const timestamp = Date.now()
  const storagePath = `${companyId}/${propertyId}/${timestamp}_${file.name}`

  const { error: uploadError } = await supabase.storage
    .from('imobiia-properties')
    .upload(storagePath, file, { upsert: false })
  if (uploadError) throw new DataLayerError('properties.images.upload', uploadError)

  const { data: { publicUrl } } = supabase.storage
    .from('imobiia-properties')
    .getPublicUrl(storagePath)

  const isMain = currentCount === 0

  const { data, error } = await supabase
    .from('property_images')
    .insert({
      property_id: propertyId,
      company_id: companyId,
      storage_path: storagePath,
      url: publicUrl,
      is_main: isMain,
      display_order: currentCount,
    })
    .select()
    .single()
  if (error) {
    await supabase.storage.from('imobiia-properties').remove([storagePath])
    throw new DataLayerError('properties.images.upload', error)
  }

  return {
    id: data.id,
    propertyId: data.property_id,
    companyId: data.company_id,
    storagePath: data.storage_path,
    url: data.url,
    isMain: data.is_main,
    displayOrder: data.display_order,
    createdAt: data.created_at,
  }
}

export async function deletePropertyImage(imageId: string, storagePath: string): Promise<void> {
  const { error: dbError } = await supabase
    .from('property_images')
    .delete()
    .eq('id', imageId)
  if (dbError) throw new DataLayerError('properties.images.delete', dbError)

  const { error: storageError } = await supabase.storage
    .from('imobiia-properties')
    .remove([storagePath])
  if (storageError) console.error('[storage] erro ao remover arquivo:', storageError)
}
