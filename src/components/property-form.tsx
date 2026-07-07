import { useState } from 'react'
import type { PropertyFormData, PropertyType, PropertyStatus, OperationType } from '#/lib/properties'
import { generateSlug } from '#/lib/properties'
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

const OPERATION_TYPES: { value: OperationType; label: string }[] = [
  { value: 'venda', label: 'Venda' },
  { value: 'aluguel', label: 'Aluguel' },
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
  bedrooms: string
  bathrooms: string
  suites: string
  parking_spots: string
  published: boolean
  featured: boolean
  slug: string
  operation_type: OperationType
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
  bedrooms?: number | null
  bathrooms?: number | null
  suites?: number | null
  parking_spots?: number | null
  published?: boolean | null
  featured?: boolean | null
  slug?: string | null
  operation_type?: OperationType | null
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
    bedrooms: defaultValues?.bedrooms != null ? String(defaultValues.bedrooms) : '',
    bathrooms: defaultValues?.bathrooms != null ? String(defaultValues.bathrooms) : '',
    suites: defaultValues?.suites != null ? String(defaultValues.suites) : '',
    parking_spots: defaultValues?.parking_spots != null ? String(defaultValues.parking_spots) : '',
    published: defaultValues?.published ?? false,
    featured: defaultValues?.featured ?? false,
    slug: defaultValues?.slug ?? '',
    operation_type: defaultValues?.operation_type ?? 'venda',
  })
  const [slugTouched, setSlugTouched] = useState(Boolean(defaultValues?.slug))
  const [error, setError] = useState<string | null>(null)

  function handleChange(field: keyof FormState) {
    return (
      e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
    ) => {
      setValues((prev) => ({ ...prev, [field]: e.target.value }))
    }
  }

  function handleTitleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const title = e.target.value
    setValues((prev) => ({
      ...prev,
      title,
      slug: slugTouched ? prev.slug : generateSlug(title),
    }))
  }

  function handleSlugChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSlugTouched(true)
    setValues((prev) => ({ ...prev, slug: e.target.value }))
  }

  function handlePublishedChange(e: React.ChangeEvent<HTMLInputElement>) {
    const published = e.target.checked
    setValues((prev) => ({ ...prev, published, featured: published ? prev.featured : false }))
  }

  function handleFeaturedChange(e: React.ChangeEvent<HTMLInputElement>) {
    setValues((prev) => ({ ...prev, featured: e.target.checked }))
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
        bedrooms: values.bedrooms ? Number(values.bedrooms) : null,
        bathrooms: values.bathrooms ? Number(values.bathrooms) : null,
        suites: values.suites ? Number(values.suites) : null,
        parking_spots: values.parking_spots ? Number(values.parking_spots) : null,
        published: values.published,
        featured: values.published ? values.featured : false,
        slug: values.slug || null,
        operation_type: values.operation_type,
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
            onChange={handleTitleChange}
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

      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-gray-900">Características</h2>
        <div className="grid gap-4 sm:grid-cols-4">
          <div className="space-y-1.5">
            <Label htmlFor="bedrooms">Quartos</Label>
            <Input
              id="bedrooms"
              type="number"
              inputMode="numeric"
              min="0"
              step="1"
              value={values.bedrooms}
              onChange={handleChange('bedrooms')}
              placeholder="0"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bathrooms">Banheiros</Label>
            <Input
              id="bathrooms"
              type="number"
              inputMode="numeric"
              min="0"
              step="1"
              value={values.bathrooms}
              onChange={handleChange('bathrooms')}
              placeholder="0"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="suites">Suítes</Label>
            <Input
              id="suites"
              type="number"
              inputMode="numeric"
              min="0"
              step="1"
              value={values.suites}
              onChange={handleChange('suites')}
              placeholder="0"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="parking_spots">Vagas</Label>
            <Input
              id="parking_spots"
              type="number"
              inputMode="numeric"
              min="0"
              step="1"
              value={values.parking_spots}
              onChange={handleChange('parking_spots')}
              placeholder="0"
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-gray-900">Publicação no Site</h2>

        <div className="flex items-center justify-between rounded-lg border border-input px-3 py-2.5">
          <div>
            <Label htmlFor="published">Publicar no site</Label>
            <p className="text-xs text-gray-500">Controla se o imóvel aparece no site</p>
          </div>
          <input
            id="published"
            type="checkbox"
            checked={values.published}
            onChange={handlePublishedChange}
            className="h-5 w-5 rounded border-input text-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>

        {values.published && (
          <div className="flex items-center justify-between rounded-lg border border-input px-3 py-2.5">
            <div>
              <Label htmlFor="featured">Destaque na home</Label>
              <p className="text-xs text-gray-500">Exibe o imóvel em destaque na home do site</p>
            </div>
            <input
              id="featured"
              type="checkbox"
              checked={values.featured}
              onChange={handleFeaturedChange}
              className="h-5 w-5 rounded border-input text-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="slug">Slug (URL)</Label>
            <Input
              id="slug"
              value={values.slug}
              onChange={handleSlugChange}
              placeholder="apartamento-2-quartos-tijuca"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="operation_type">Tipo de operação</Label>
            <select
              id="operation_type"
              value={values.operation_type}
              onChange={handleChange('operation_type')}
              className={selectClass}
            >
              {OPERATION_TYPES.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
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
