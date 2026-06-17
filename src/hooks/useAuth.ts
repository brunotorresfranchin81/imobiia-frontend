import { useEffect, useState } from 'react'
import { getAuthClaims, type AuthClaims } from '#/lib/auth'
import { supabase } from '#/lib/supabase'

export function useAuth() {
  const [claims, setClaims] = useState<AuthClaims | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let mounted = true

    async function loadClaims() {
      try {
        const authClaims = await getAuthClaims()
        if (mounted) {
          setClaims(authClaims)
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err : new Error('Failed to load auth claims'))
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    loadClaims()

    // Subscribe to auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, _session) => {
      if (mounted) {
        const newClaims = await getAuthClaims()
        setClaims(newClaims)
      }
    })

    return () => {
      mounted = false
      subscription?.unsubscribe()
    }
  }, [])

  return { claims, loading, error, isAuthenticated: !!claims }
}
