import { supabase } from './supabase'
import { DataLayerError } from './errors'

export interface LeadStatusCount {
  status: string
  count: number
}

export interface TopCorretor {
  id: string
  full_name: string
  leadCount: number
}

export interface DashboardMetrics {
  totalLeads: number
  leadsByStatus: LeadStatusCount[]
  topCorretores: TopCorretor[]
  activeProperties: number
}

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const { data, error } = await supabase.rpc('get_dashboard_metrics')
  if (error) throw new DataLayerError('analytics.getDashboardMetrics', error)
  return data as unknown as DashboardMetrics
}
