import { useState } from 'react'
import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { getLeadById, updateLead } from '#/lib/leads'
import type { LeadFormData } from '#/lib/leads'
import { LeadForm } from '#/components/lead-form'

export const Route = createFileRoute('/_authenticated/oportunidades/$id/editar')({
  loader: ({ params }) => getLeadById(params.id),
  component: OportunidadesEditarPage,
})

function OportunidadesEditarPage() {
  const lead = Route.useLoaderData()
  const { id } = Route.useParams()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(data: LeadFormData) {
    setIsLoading(true)
    try {
      await updateLead(id, data)
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
        <h1 className="text-2xl font-bold text-gray-900">Editar Oportunidade</h1>
      </div>
      <div className="max-w-2xl">
        <LeadForm
          defaultValues={{
            full_name: lead.full_name,
            email: lead.email,
            phone: lead.phone,
            source: lead.source,
            status: lead.status,
            budget_min: lead.budget_min,
            budget_max: lead.budget_max,
            notes: lead.notes,
          }}
          onSubmit={(data) => handleSubmit(data)}
          isLoading={isLoading}
        />
      </div>
    </div>
  )
}
