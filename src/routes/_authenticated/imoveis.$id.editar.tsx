import { useState } from 'react'
import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { getPropertyById, updateProperty } from '#/lib/properties'
import type { PropertyFormData } from '#/lib/properties'
import { PropertyForm } from '#/components/property-form'

export const Route = createFileRoute('/_authenticated/imoveis/$id/editar')({
  loader: ({ params }) => getPropertyById(params.id),
  component: ImoveisEditarPage,
})

function ImoveisEditarPage() {
  const property = Route.useLoaderData()
  const { id } = Route.useParams()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(data: PropertyFormData) {
    setIsLoading(true)
    try {
      await updateProperty(id, data)
      void router.navigate({ to: '/imoveis' })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="p-6 sm:p-8">
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <Link
          to="/imoveis"
          className="shrink-0 text-sm text-gray-500 hover:text-gray-700"
        >
          ← Imóveis
        </Link>
        <h1 className="min-w-0 text-2xl font-bold text-gray-900">Editar Imóvel</h1>
      </div>
      <div className="max-w-2xl">
        <PropertyForm
          defaultValues={{
            title: property.title,
            description: property.description,
            address: property.address,
            neighborhood: property.neighborhood,
            city: property.city,
            property_type: property.property_type,
            status: property.status,
            area_m2: property.area_m2 != null ? String(property.area_m2) : '',
            price: property.price != null ? String(Number(property.price)) : '',
          }}
          onSubmit={(data) => handleSubmit(data)}
          isLoading={isLoading}
        />
      </div>
    </div>
  )
}
