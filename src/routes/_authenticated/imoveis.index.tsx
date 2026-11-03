import { useState } from 'react'
import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { Building2 } from 'lucide-react'
import { listProperties } from '#/lib/properties'
import type { Property, PropertyType } from '#/lib/properties'
import { SITUACAO_COLORS, SITUACAO_LABELS, isForaDoSite } from '#/lib/property-situacao'
import { useAuth } from '#/hooks/useAuth'
import { PropertySituacaoActions } from '#/components/property-situacao-actions'
import { Button } from '#/components/ui/button'

export const Route = createFileRoute('/_authenticated/imoveis/')({
  // aviso = mensagem leve vinda de outra tela (ex.: excluiu mas sobrou foto no bucket)
  validateSearch: (search: Record<string, unknown>): { aviso?: string } => ({
    aviso: typeof search.aviso === 'string' ? search.aviso : undefined,
  }),
  loader: () => listProperties(),
  component: ImoveisIndexPage,
})

const TIPO_LABELS: Record<PropertyType, string> = {
  apartamento: 'Apartamento',
  casa: 'Casa',
  comercial: 'Comercial',
  terreno: 'Terreno',
  outro: 'Outro',
}

function formatPrice(price: number | null) {
  if (price == null) return '—'
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(price))
}

function SituacaoBadge({ status }: { status: Property['status'] }) {
  if (!status) return <span className="text-gray-400">—</span>
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${SITUACAO_COLORS[status]}`}
    >
      {SITUACAO_LABELS[status]}
    </span>
  )
}

function ImoveisIndexPage() {
  const allProperties = Route.useLoaderData()
  const router = useRouter()
  const { claims } = useAuth()
  const isAdmin = claims?.role === 'admin'
  const [showArchived, setShowArchived] = useState(false)
  const { aviso } = Route.useSearch()
  const [notice, setNotice] = useState<string | null>(aviso ?? null)

  function dismissNotice() {
    setNotice(null)
    if (aviso) void router.navigate({ to: '/imoveis', search: {}, replace: true })
  }

  // vendido/alugado/arquivado ficam fora da lista padrão
  const archivedCount = allProperties.filter((p) => isForaDoSite(p.status)).length
  const properties = showArchived
    ? allProperties
    : allProperties.filter((p) => !isForaDoSite(p.status))

  return (
    <div className="p-6 sm:p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Imóveis</h1>
        <Button asChild>
          <Link to="/imoveis/novo">Novo Imóvel</Link>
        </Button>
      </div>

      {notice && (
        <div role="status" className="mb-4 flex items-start justify-between gap-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <span>{notice}</span>
          <button type="button" onClick={dismissNotice} className="shrink-0 underline">
            Fechar
          </button>
        </div>
      )}

      <label className="mb-4 inline-flex items-center gap-2 text-sm text-gray-600">
        <input
          type="checkbox"
          checked={showArchived}
          onChange={(e) => setShowArchived(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300"
        />
        Mostrar arquivados{archivedCount > 0 ? ` (${archivedCount})` : ''}
      </label>

      {properties.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-20 text-center">
          <Building2 className="mb-4 h-12 w-12 text-gray-300" />
          <p className="text-base font-medium text-gray-500">
            {allProperties.length > 0 ? 'Nenhum imóvel disponível' : 'Nenhum imóvel cadastrado'}
          </p>
          <p className="mt-1 text-sm text-gray-400">
            {allProperties.length > 0
              ? 'Marque "Mostrar arquivados" para ver os vendidos e alugados'
              : 'Clique em "Novo Imóvel" para começar'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Título
                </th>
                <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 sm:table-cell">
                  Endereço
                </th>
                <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 md:table-cell">
                  Tipo
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Situação
                </th>
                <th className="hidden px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 sm:table-cell">
                  Preço
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {properties.map((property) => (
                <tr key={property.id} className="hover:bg-gray-50">
                  <td className="max-w-[200px] px-4 py-3">
                    <div className="truncate font-medium text-gray-900">
                      {property.title}
                    </div>
                    <div className="truncate text-xs text-gray-400">
                      {property.reference_code}
                    </div>
                  </td>
                  <td className="hidden px-4 py-3 text-sm text-gray-600 sm:table-cell">
                    {property.address}
                  </td>
                  <td className="hidden px-4 py-3 text-sm text-gray-600 md:table-cell">
                    {property.property_type
                      ? TIPO_LABELS[property.property_type]
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <SituacaoBadge status={property.status} />
                  </td>
                  <td className="hidden px-4 py-3 text-right text-sm text-gray-700 sm:table-cell">
                    {formatPrice(property.price)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <Link
                        to="/imoveis/$id/editar"
                        params={{ id: property.id }}
                        className="inline-flex items-center -my-2 px-1 py-2 text-sm font-medium text-[#0E3A52] hover:underline"
                      >
                        Editar
                      </Link>
                      <PropertySituacaoActions
                        property={property}
                        isAdmin={isAdmin}
                        size="sm"
                        onSituacaoChanged={() => { void router.invalidate() }}
                        onDeleted={(warning) => {
                          setNotice(warning)
                          void router.invalidate()
                        }}
                      />
                    </div>
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
