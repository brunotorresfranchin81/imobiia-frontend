import { supabase } from './supabase'
import { getAuthContext } from './auth'
import { DataLayerError } from './errors'
import type { Database } from './database.types'

export type Property = Database['public']['Tables']['properties']['Row']
export type PropertyType = Database['public']['Enums']['property_type']
export type PropertyStatus = Database['public']['Enums']['property_status']

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
