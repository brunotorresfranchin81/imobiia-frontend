import { supabase } from './supabase'
import { getAuthContext } from './auth'
import { DataLayerError } from './errors'
import type { Database } from './database.types'
import type { StatusHistoryEntry } from '#/types/domain'

export type Lead = Database['public']['Tables']['leads']['Row']
export type LeadSource = Database['public']['Enums']['lead_source']
export type LeadStatus = Database['public']['Enums']['lead_status']

export type LeadFormData = {
  full_name: string
  email: string
  source: LeadSource
  status: LeadStatus
  phone?: string | null
  assigned_to?: string | null
  budget_min?: number | null
  budget_max?: number | null
  notes?: string | null
}

export type Corretor = Pick<Database['public']['Tables']['profiles']['Row'], 'id' | 'full_name'>

export async function listCorretores(): Promise<Corretor[]> {
  const { companyId } = await getAuthContext()

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('company_id', companyId)
    .eq('role', 'corretor')
    .order('full_name')

  if (error) throw new DataLayerError('leads.listCorretores', error)
  return data ?? []
}

export async function listLeads(): Promise<Lead[]> {
  const { role, userId } = await getAuthContext()

  const baseQuery = supabase
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false })

  const { data, error } = await (
    role === 'corretor'
      ? baseQuery.or(`assigned_to.eq.${userId},assigned_to.is.null`)
      : baseQuery
  )

  if (error) throw new DataLayerError('leads.list', error)
  return data ?? []
}

export async function getLeadById(id: string): Promise<Lead> {
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw new DataLayerError('leads.getById', error)
  return data
}

export async function createLead(formData: LeadFormData): Promise<Lead> {
  const { companyId } = await getAuthContext()

  const { data, error } = await supabase
    .from('leads')
    .insert({
      ...formData,
      company_id: companyId,
    })
    .select()
    .single()

  if (error) throw new DataLayerError('leads.create', error)
  return data
}

export async function updateLead(id: string, formData: LeadFormData): Promise<Lead> {
  const { data, error } = await supabase
    .from('leads')
    .update({ ...formData, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw new DataLayerError('leads.update', error)
  return data
}

export type LeadWithDetails = Lead & { corretor_name: string | null }

export async function getLeadWithDetails(id: string): Promise<LeadWithDetails> {
  const { data, error } = await supabase
    .from('leads')
    .select('*, profiles!leads_assigned_to_fkey(full_name)')
    .eq('id', id)
    .single()
  if (error) throw new DataLayerError('leads.getWithDetails', error)
  const { profiles, ...lead } = data as Lead & { profiles: { full_name: string } | null }
  return { ...lead, corretor_name: profiles?.full_name ?? null }
}

export async function getStatusHistory(leadId: string): Promise<StatusHistoryEntry[]> {
  const { data, error } = await supabase
    .from('lead_status_history')
    .select('id, lead_id, old_status, new_status, changed_at, profiles!lead_status_history_changed_by_fkey(id, full_name)')
    .eq('lead_id', leadId)
    .order('changed_at', { ascending: true })
  if (error) throw new DataLayerError('leads.getStatusHistory', error)
  return (data ?? []).map(row => ({
    id: row.id,
    leadId: row.lead_id,
    oldStatus: row.old_status,
    newStatus: row.new_status,
    changedAt: row.changed_at,
    changedBy: (row as any).profiles ?? null,
  }))
}
