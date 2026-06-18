import { useEffect } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { signOut } from '#/lib/auth'
import { useAuth } from '#/hooks/useAuth'
import { Button } from '#/components/ui/button'

export const Route = createFileRoute('/dashboard')({ component: DashboardPage })

function DashboardPage() {
  const navigate = useNavigate()
  const { claims, loading, isAuthenticated } = useAuth()

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      void navigate({ to: '/auth/login' })
    }
  }, [loading, isAuthenticated, navigate])

  if (loading) return null

  async function handleLogout() {
    await signOut()
    void navigate({ to: '/auth/login' })
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p className="mt-2 text-muted-foreground">
        Você está logado como {claims?.email ?? '—'}
      </p>
      <Button variant="outline" className="mt-4" onClick={() => { void handleLogout() }}>
        Sair
      </Button>
    </div>
  )
}
