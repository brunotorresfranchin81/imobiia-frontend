import { createFileRoute, Link } from '@tanstack/react-router'
import { Users } from 'lucide-react'
import { listLeads } from '#/lib/leads'
import type { Lead, LeadSource, LeadStatus } from '#/lib/leads'
import { Button } from '#/components/ui/button'

export const Route = createFileRoute('/_authenticated/oportunidades/')({
  loader: () => listLeads(),
  errorComponent: () => (
    <div className="p-8 text-center text-destructive">
      Erro ao carregar oportunidades. Tente novamente.
    </div>
  ),
  component: OportunidadesIndexPage,
})

const SOURCE_LABELS: Record<LeadSource, string> = {
  site: 'Site',
  portal: 'Portal',
  indicacao: 'Indicação',
  outro: 'Outro',
}

const STATUS_LABELS: Record<LeadStatus, string> = {
  novo: 'Novo',
  qualificado: 'Qualificado',
  em_visita: 'Em Visita',
  proposta: 'Proposta',
  fechado: 'Fechado',
  perdido: 'Perdido',
}

const STATUS_COLORS: Record<LeadStatus, string> = {
  novo: 'bg-blue-100 text-blue-700',
  qualificado: 'bg-purple-100 text-purple-700',
  em_visita: 'bg-yellow-100 text-yellow-700',
  proposta: 'bg-orange-100 text-orange-700',
  fechado: 'bg-green-100 text-green-700',
  perdido: 'bg-red-100 text-red-700',
}

function formatBudget(min: number | null, max: number | null) {
  const fmt = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
  if (min != null && max != null) return `${fmt(min)} – ${fmt(max)}`
  if (min != null) return `A partir de ${fmt(min)}`
  if (max != null) return `Até ${fmt(max)}`
  return '—'
}

function StatusBadge({ status }: { status: Lead['status'] }) {
  if (!status) return <span className="text-gray-400">—</span>
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  )
}

function OportunidadesIndexPage() {
  const leads = Route.useLoaderData()

  return (
    <div className="p-6 sm:p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Oportunidades</h1>
        <Button asChild>
          <Link to="/oportunidades/novo">Nova Oportunidade</Link>
        </Button>
      </div>

      {leads.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-20 text-center">
          <Users className="mb-4 h-12 w-12 text-gray-300" />
          <p className="text-base font-medium text-gray-500">
            Nenhuma oportunidade cadastrada
          </p>
          <p className="mt-1 text-sm text-gray-400">
            Clique em &quot;Nova Oportunidade&quot; para começar
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Nome
                </th>
                <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 sm:table-cell">
                  E-mail
                </th>
                <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 md:table-cell">
                  Origem
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Status
                </th>
                <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 lg:table-cell">
                  Orçamento
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {leads.map((lead) => (
                <tr key={lead.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{lead.full_name}</div>
                    <div className="text-xs text-gray-400 sm:hidden">{lead.email}</div>
                  </td>
                  <td className="hidden px-4 py-3 text-sm text-gray-600 sm:table-cell">
                    {lead.email}
                  </td>
                  <td className="hidden px-4 py-3 text-sm text-gray-600 md:table-cell">
                    {lead.source ? SOURCE_LABELS[lead.source] : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={lead.status} />
                  </td>
                  <td className="hidden px-4 py-3 text-sm text-gray-600 lg:table-cell">
                    {formatBudget(lead.budget_min, lead.budget_max)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      to="/oportunidades/$id/editar"
                      params={{ id: lead.id }}
                      className="text-sm font-medium text-[#0E3A52] hover:underline"
                    >
                      Editar
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
