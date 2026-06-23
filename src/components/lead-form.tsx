import { useState } from 'react'
import type { LeadFormData, LeadSource, LeadStatus } from '#/lib/leads'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'

const LEAD_SOURCES: { value: LeadSource; label: string }[] = [
  { value: 'site', label: 'Site' },
  { value: 'portal', label: 'Portal' },
  { value: 'indicacao', label: 'Indicação' },
  { value: 'outro', label: 'Outro' },
]

const LEAD_STATUSES: { value: LeadStatus; label: string }[] = [
  { value: 'novo', label: 'Novo' },
  { value: 'qualificado', label: 'Qualificado' },
  { value: 'em_visita', label: 'Em Visita' },
  { value: 'proposta', label: 'Proposta' },
  { value: 'fechado', label: 'Fechado' },
  { value: 'perdido', label: 'Perdido' },
]

interface FormState {
  full_name: string
  email: string
  phone: string
  source: LeadSource
  status: LeadStatus
  budget_min: string
  budget_max: string
  notes: string
}

interface LeadFormDefaultValues {
  full_name?: string
  email?: string
  phone?: string | null
  source?: LeadSource | null
  status?: LeadStatus | null
  budget_min?: number | null
  budget_max?: number | null
  notes?: string | null
}

interface LeadFormProps {
  defaultValues?: LeadFormDefaultValues
  onSubmit: (data: LeadFormData) => Promise<void>
  isLoading?: boolean
}

export function LeadForm({ defaultValues, onSubmit, isLoading }: LeadFormProps) {
  const [values, setValues] = useState<FormState>({
    full_name: defaultValues?.full_name ?? '',
    email: defaultValues?.email ?? '',
    phone: defaultValues?.phone ?? '',
    source: defaultValues?.source ?? 'outro',
    status: defaultValues?.status ?? 'novo',
    budget_min: defaultValues?.budget_min != null ? String(defaultValues.budget_min) : '',
    budget_max: defaultValues?.budget_max != null ? String(defaultValues.budget_max) : '',
    notes: defaultValues?.notes ?? '',
  })
  const [error, setError] = useState<string | null>(null)

  function handleChange(field: keyof FormState) {
    return (
      e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
    ) => {
      setValues((prev) => ({ ...prev, [field]: e.target.value }))
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const budgetMin = values.budget_min ? Number(values.budget_min) : null
    const budgetMax = values.budget_max ? Number(values.budget_max) : null

    if (budgetMin != null && budgetMax != null && budgetMin > budgetMax) {
      setError('Orçamento mínimo não pode ser maior que o máximo')
      return
    }

    try {
      await onSubmit({
        full_name: values.full_name,
        email: values.email,
        source: values.source,
        status: values.status,
        phone: values.phone || null,
        budget_min: budgetMin,
        budget_max: budgetMax,
        notes: values.notes || null,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar oportunidade')
    }
  }

  const selectClass =
    'w-full rounded-lg border border-input bg-transparent px-3 py-1.5 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'

  const textareaClass =
    'w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'

  return (
    <form onSubmit={(e) => { void handleSubmit(e) }} className="space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2 space-y-1.5">
          <Label htmlFor="full_name">Nome completo *</Label>
          <Input
            id="full_name"
            value={values.full_name}
            onChange={handleChange('full_name')}
            required
            placeholder="Ex: João da Silva"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">E-mail *</Label>
          <Input
            id="email"
            type="email"
            value={values.email}
            onChange={handleChange('email')}
            required
            placeholder="joao@exemplo.com"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="phone">Telefone</Label>
          <Input
            id="phone"
            value={values.phone}
            onChange={handleChange('phone')}
            placeholder="(11) 99999-9999"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="source">Origem</Label>
          <select
            id="source"
            value={values.source}
            onChange={handleChange('source')}
            className={selectClass}
          >
            {LEAD_SOURCES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="status">Status</Label>
          <select
            id="status"
            value={values.status}
            onChange={handleChange('status')}
            className={selectClass}
          >
            {LEAD_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="budget_min">Orçamento mínimo (R$)</Label>
          <Input
            id="budget_min"
            type="number"
            min="0"
            step="0.01"
            value={values.budget_min}
            onChange={handleChange('budget_min')}
            placeholder="0,00"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="budget_max">Orçamento máximo (R$)</Label>
          <Input
            id="budget_max"
            type="number"
            min="0"
            step="0.01"
            value={values.budget_max}
            onChange={handleChange('budget_max')}
            placeholder="0,00"
          />
        </div>

        <div className="sm:col-span-2 space-y-1.5">
          <Label htmlFor="notes">Observações</Label>
          <textarea
            id="notes"
            value={values.notes}
            onChange={handleChange('notes')}
            rows={3}
            className={textareaClass}
            placeholder="Notas sobre o lead..."
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Salvando...' : 'Salvar Oportunidade'}
        </Button>
      </div>
    </form>
  )
}
