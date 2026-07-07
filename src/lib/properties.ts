import { supabase } from './supabase'
import { getAuthContext } from './auth'
import { DataLayerError } from './errors'
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
  property_type: PropertyType
  status: PropertyStatus
  area_m2?: number | null
  price: number
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
