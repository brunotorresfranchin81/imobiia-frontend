import { useState } from 'react'
import type { PropertyFormData, PropertyType, PropertyStatus } from '#/lib/properties'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'

const PROPERTY_TYPES: { value: PropertyType; label: string }[] = [
  { value: 'apartamento', label: 'Apartamento' },
  { value: 'casa', label: 'Casa' },
  { value: 'comercial', label: 'Comercial' },
  { value: 'terreno', label: 'Terreno' },
  { value: 'outro', label: 'Outro' },
]

const PROPERTY_STATUSES: { value: PropertyStatus; label: string }[] = [
  { value: 'ativo', label: 'Ativo' },
  { value: 'reservado', label: 'Reservado' },
  { value: 'vendido', label: 'Vendido' },
  { value: 'arquivado', label: 'Arquivado' },
]

interface FormState {
  title: string
  description: string
  address: string
  neighborhood: string
  city: string
  property_type: PropertyType
  status: PropertyStatus
  area_m2: string
  price: string
}

interface PropertyFormDefaultValues {
  title?: string
  description?: string | null
  address?: string
  neighborhood?: string | null
  city?: string | null
  property_type?: PropertyType | null
  status?: PropertyStatus | null
  area_m2?: string
  price?: string
}

interface PropertyFormProps {
  defaultValues?: PropertyFormDefaultValues
  onSubmit: (data: PropertyFormData) => Promise<void>
  isLoading?: boolean
}

export function PropertyForm({ defaultValues, onSubmit, isLoading }: PropertyFormProps) {
  const [values, setValues] = useState<FormState>({
    title: defaultValues?.title ?? '',
    description: defaultValues?.description ?? '',
    address: defaultValues?.address ?? '',
    neighborhood: defaultValues?.neighborhood ?? '',
    city: defaultValues?.city ?? '',
    property_type: defaultValues?.property_type ?? 'apartamento',
    status: defaultValues?.status ?? 'ativo',
    area_m2: defaultValues?.area_m2 ?? '',
    price: defaultValues?.price ?? '',
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
    try {
      await onSubmit({
        title: values.title,
        description: values.description || null,
        address: values.address,
        neighborhood: values.neighborhood || null,
        city: values.city || null,
        property_type: values.property_type,
        status: values.status,
        area_m2: values.area_m2 ? Number(values.area_m2) : null,
        price: Number(values.price),
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar imóvel')
    }
  }

  const selectClass =
    'w-full rounded-lg border border-input bg-transparent px-3 py-2.5 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'

  const textareaClass =
    'w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'

  return (
    <form onSubmit={(e) => { void handleSubmit(e) }} className="space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2 space-y-1.5">
          <Label htmlFor="title">Título *</Label>
          <Input
            id="title"
            value={values.title}
            onChange={handleChange('title')}
            required
            placeholder="Ex: Apartamento 3 quartos no Centro"
          />
        </div>

        <div className="sm:col-span-2 space-y-1.5">
          <Label htmlFor="description">Descrição</Label>
          <textarea
            id="description"
            value={values.description}
            onChange={handleChange('description')}
            rows={3}
            className={textareaClass}
            placeholder="Descreva o imóvel..."
          />
        </div>

        <div className="sm:col-span-2 space-y-1.5">
          <Label htmlFor="address">Endereço *</Label>
          <Input
            id="address"
            value={values.address}
            onChange={handleChange('address')}
            required
            placeholder="Rua, número"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="neighborhood">Bairro</Label>
          <Input
            id="neighborhood"
            value={values.neighborhood}
            onChange={handleChange('neighborhood')}
            placeholder="Bairro"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="city">Cidade</Label>
          <Input
            id="city"
            value={values.city}
            onChange={handleChange('city')}
            placeholder="Cidade"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="property_type">Tipo</Label>
          <select
            id="property_type"
            value={values.property_type}
            onChange={handleChange('property_type')}
            className={selectClass}
          >
            {PROPERTY_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
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
            {PROPERTY_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="area_m2">Área (m²)</Label>
          <Input
            id="area_m2"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={values.area_m2}
            onChange={handleChange('area_m2')}
            placeholder="0,00"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="price">Preço (R$) *</Label>
          <Input
            id="price"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={values.price}
            onChange={handleChange('price')}
            required
            placeholder="0,00"
          />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:justify-end">
        <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
          {isLoading ? 'Salvando...' : 'Salvar Imóvel'}
        </Button>
      </div>
    </form>
  )
}
