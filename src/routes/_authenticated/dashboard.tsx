import { createFileRoute } from '@tanstack/react-router'
import { useAuth } from '#/hooks/useAuth'

export const Route = createFileRoute('/_authenticated/dashboard')({
  component: DashboardPage,
})

function DashboardPage() {
  const { claims } = useAuth()
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Visão Geral</h1>
      <p className="mt-2 text-muted-foreground">
        Você está logado como {claims?.email ?? '—'}
      </p>
    </div>
  )
}
