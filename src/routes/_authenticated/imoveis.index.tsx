import { createFileRoute, Link } from '@tanstack/react-router'
import { Building2 } from 'lucide-react'
import { listProperties } from '#/lib/properties'
import type { Property, PropertyStatus, PropertyType } from '#/lib/properties'
import { Button } from '#/components/ui/button'

export const Route = createFileRoute('/_authenticated/imoveis/')({
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

const STATUS_LABELS: Record<PropertyStatus, string> = {
  ativo: 'Ativo',
  reservado: 'Reservado',
  vendido: 'Vendido',
  arquivado: 'Arquivado',
}

const STATUS_COLORS: Record<PropertyStatus, string> = {
  ativo: 'bg-green-100 text-green-700',
  reservado: 'bg-yellow-100 text-yellow-700',
  vendido: 'bg-blue-100 text-blue-700',
  arquivado: 'bg-gray-100 text-gray-600',
}

function formatPrice(price: number | null) {
  if (price == null) return '—'
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(price))
}

function StatusBadge({ status }: { status: Property['status'] }) {
  if (!status) return <span className="text-gray-400">—</span>
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  )
}

function ImoveisIndexPage() {
  const properties = Route.useLoaderData()

  return (
    <div className="p-6 sm:p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Imóveis</h1>
        <Button asChild>
          <Link to="/imoveis/novo">Novo Imóvel</Link>
        </Button>
      </div>

      {properties.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-20 text-center">
          <Building2 className="mb-4 h-12 w-12 text-gray-300" />
          <p className="text-base font-medium text-gray-500">
            Nenhum imóvel cadastrado
          </p>
          <p className="mt-1 text-sm text-gray-400">
            Clique em &quot;Novo Imóvel&quot; para começar
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
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
                  Status
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
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">
                      {property.title}
                    </div>
                    <div className="text-xs text-gray-400">
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
                    <StatusBadge status={property.status} />
                  </td>
                  <td className="hidden px-4 py-3 text-right text-sm text-gray-700 sm:table-cell">
                    {formatPrice(property.price)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      to="/imoveis/$id/editar"
                      params={{ id: property.id }}
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
