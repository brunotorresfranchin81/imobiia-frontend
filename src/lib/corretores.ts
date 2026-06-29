import { supabase } from './supabase'
import { refreshSession } from './auth'
import { DataLayerError } from './errors'
import type { Database } from './database.types'

export type CorretorListItem = Pick<
  Database['public']['Tables']['profiles']['Row'],
  'id' | 'full_name' | 'role' | 'active'
>

export const ROLE_LABELS: Record<string, string> = {
  corretor: 'Corretor',
  gestor: 'Gestor',
  admin: 'Administrador',
}

export async function listCorretores(): Promise<CorretorListItem[]> {
  const session = await refreshSession()
  if (!session?.user) throw new DataLayerError('corretores.list', 'Nao autenticado')
  const appMetadata = session.user.app_metadata as Record<string, unknown>
  const companyId = appMetadata?.company_id as string
  if (!companyId) throw new DataLayerError('corretores.list', 'companyId ausente')
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, role, active')
    .eq('company_id', companyId)
    .order('full_name', { ascending: true })
  if (error) throw new DataLayerError('corretores.list', error)
  return data ?? []
}

export async function toggleCorretorActive(id: string, active: boolean): Promise<void> {
  const session = await refreshSession()
  if (!session?.user) throw new DataLayerError('corretores.toggleActive', 'Nao autenticado')
  const appMetadata = session.user.app_metadata as Record<string, unknown>
  const companyId = appMetadata?.company_id as string
  const { error } = await supabase
    .from('profiles')
    .update({ active })
    .eq('id', id)
    .eq('company_id', companyId)
  if (error) throw new DataLayerError('corretores.toggleActive', error)
}

export async function inviteCorretor(email: string, fullName: string): Promise<void> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const { data: { session } } = await supabase.auth.getSession()
  const response = await fetch(`${supabaseUrl}/functions/v1/invite-corretor`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.access_token}`,
    },
    body: JSON.stringify({ email, fullName }),
  })
  if (!response.ok) throw new DataLayerError('corretores.invite', await response.json())
}
