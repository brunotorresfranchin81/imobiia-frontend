import { supabase } from './supabase'

export type UserRole = 'admin' | 'gestor' | 'corretor'

export interface AuthClaims {
  userId: string
  email: string
  role: UserRole
  companyId: string
}

export async function getSession() {
  const { data, error } = await supabase.auth.getSession()
  if (error) {
    console.error('Error getting session:', error)
    return null
  }
  return data.session
}

export async function getAuthClaims(): Promise<AuthClaims | null> {
  const session = await getSession()
  if (!session?.user) {
    return null
  }

  const appMetadata = session.user.app_metadata as Record<string, unknown> | undefined
  if (!appMetadata) {
    return null
  }

  return {
    userId: session.user.id,
    email: session.user.email || '',
    role: (appMetadata.role as UserRole) || 'corretor',
    companyId: (appMetadata.company_id as string) || '',
  }
}

export async function signUp(email: string, password: string) {
  return await supabase.auth.signUp({
    email,
    password,
  })
}

export async function signIn(email: string, password: string) {
  return await supabase.auth.signInWithPassword({
    email,
    password,
  })
}

export async function signOut() {
  return await supabase.auth.signOut()
}

export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser()
  if (error) {
    console.error('Error getting user:', error)
    return null
  }
  return data.user
}
