import { supabase } from './supabase'

function logError(context: string, ...args: unknown[]) {
  if (import.meta.env.DEV) console.error(`[${context}]`, ...args)
}

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
    logError('auth.getSession', error)
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

export async function getAuthContext(): Promise<AuthClaims> {
  const claims = await getAuthClaims()
  if (!claims?.companyId) throw new Error('[auth] Não autenticado ou companyId ausente')
  return claims
}

export async function refreshSession() {
  const { data, error } = await supabase.auth.refreshSession()
  if (error) {
    logError('auth.refreshSession', error)
    return null
  }
  return data.session
}

export async function signUp(
  email: string,
  password: string,
  fullName: string,
  companyName: string,
) {
  return await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        company_name: companyName,
      },
    },
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
    logError('auth.getCurrentUser', error)
    return null
  }
  return data.user
}
