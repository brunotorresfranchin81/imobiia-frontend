import { useState } from 'react'
import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { createProperty } from '#/lib/properties'
import type { PropertyFormData } from '#/lib/properties'
import { PropertyForm } from '#/components/property-form'

export const Route = createFileRoute('/_authenticated/imoveis/novo')({
  component: ImoveisNovoPage,
})

function ImoveisNovoPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(data: PropertyFormData) {
    setIsLoading(true)
    try {
      await createProperty(data)
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
        <h1 className="min-w-0 text-2xl font-bold text-gray-900">Novo Imóvel</h1>
      </div>
      <div className="max-w-2xl">
        <PropertyForm
          onSubmit={(data) => handleSubmit(data)}
          isLoading={isLoading}
        />
      </div>
    </div>
  )
}
