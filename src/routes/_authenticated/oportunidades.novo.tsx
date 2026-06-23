import { useState } from 'react'
import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { createLead, listCorretores } from '#/lib/leads'
import type { LeadFormData } from '#/lib/leads'
import { LeadForm } from '#/components/lead-form'

export const Route = createFileRoute('/_authenticated/oportunidades/novo')({
  loader: async () => ({ corretores: await listCorretores() }),
  component: OportunidadesNovoPage,
})

function OportunidadesNovoPage() {
  const { corretores } = Route.useLoaderData()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(data: LeadFormData) {
    setIsLoading(true)
    try {
      await createLead(data)
      void router.navigate({ to: '/oportunidades' })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="p-6 sm:p-8">
      <div className="mb-6 flex items-center gap-4">
        <Link
          to="/oportunidades"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← Oportunidades
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Nova Oportunidade</h1>
      </div>
      <div className="max-w-2xl">
        <LeadForm
          corretores={corretores}
          onSubmit={(data) => handleSubmit(data)}
          isLoading={isLoading}
        />
      </div>
    </div>
  )
}
