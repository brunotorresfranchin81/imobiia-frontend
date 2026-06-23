import { useState } from 'react'
import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { getLeadById, listCorretores, updateLead } from '#/lib/leads'
import type { LeadFormData } from '#/lib/leads'
import { LeadForm } from '#/components/lead-form'

export const Route = createFileRoute('/_authenticated/oportunidades/$id/editar')({
  loader: ({ params }) =>
    Promise.all([getLeadById(params.id), listCorretores()]).then(([lead, corretores]) => ({
      lead,
      corretores,
    })),
  component: OportunidadesEditarPage,
})

function OportunidadesEditarPage() {
  const { lead, corretores } = Route.useLoaderData()
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
            assigned_to: lead.assigned_to ?? '',
            budget_min: lead.budget_min,
            budget_max: lead.budget_max,
            notes: lead.notes,
          }}
          corretores={corretores}
          onSubmit={(data) => handleSubmit(data)}
          isLoading={isLoading}
        />
      </div>
    </div>
  )
}
