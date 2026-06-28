import { createFileRoute } from '@tanstack/react-router'
import { useAuth } from '#/hooks/useAuth'
import { getDashboardMetrics } from '#/lib/analytics'
import { KpiCard } from '#/components/kpi-card'
import { LeadsByStatusChart } from '#/components/leads-by-status-chart'

export const Route = createFileRoute('/_authenticated/dashboard')({
  loader: () => getDashboardMetrics(),
  pendingComponent: () => (
    <div className="p-4 md:p-8 text-muted-foreground text-sm">Carregando métricas...</div>
  ),
  errorComponent: () => (
    <div className="p-4 md:p-8 text-destructive text-sm">
      Erro ao carregar dashboard. Tente recarregar a página.
    </div>
  ),
  component: DashboardPage,
})

function DashboardPage() {
  const metrics = Route.useLoaderData()
  const { claims } = useAuth()

  const activeLeads = metrics.leadsByStatus
    .filter((s) => !['fechado', 'perdido', 'arquivado'].includes(s.status))
    .reduce((acc, s) => acc + s.count, 0)

  return (
    <div className="p-4 space-y-4 md:p-8 md:space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Visão Geral</h1>
        <p className="text-sm text-muted-foreground">{claims?.email ?? '—'}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Total de Leads" value={metrics.totalLeads} />
        <KpiCard label="Imóveis Ativos" value={metrics.activeProperties} />
        <KpiCard
          label="Corretor Top"
          value={metrics.topCorretores[0]?.full_name ?? '—'}
        />
        <KpiCard label="Leads Ativos" value={activeLeads} />
      </div>

      {metrics.leadsByStatus.length > 0 && (
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Leads por Status</h2>
          <LeadsByStatusChart data={metrics.leadsByStatus} />
        </div>
      )}

      {metrics.topCorretores.length > 0 && (
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Top Corretores</h2>
          <div className="space-y-2">
            {metrics.topCorretores.map((c, i) => (
              <div key={c.id} className="flex items-center justify-between">
                <span className="text-sm font-medium">{i + 1}. {c.full_name}</span>
                <span className="text-sm text-muted-foreground">{c.leadCount} leads</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
