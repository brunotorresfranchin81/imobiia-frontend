import { useRef, useState } from 'react'
import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import {
  getPropertyById,
  updateProperty,
  listPropertyImages,
  uploadPropertyImage,
  deletePropertyImage,
} from '#/lib/properties'
import type { PropertyFormData, PropertyImage } from '#/lib/properties'
import { PropertyForm } from '#/components/property-form'
import { Button } from '#/components/ui/button'

interface PendingUpload {
  tempId: string
  previewUrl: string
  error: string | null
}

export const Route = createFileRoute('/_authenticated/imoveis/$id/editar')({
  loader: async ({ params }) => {
    const [property, images] = await Promise.all([
      getPropertyById(params.id),
      listPropertyImages(params.id),
    ])
    return { property, images }
  },
  component: ImoveisEditarPage,
})

function ImoveisEditarPage() {
  const { property, images: initialImages } = Route.useLoaderData()
  const { id } = Route.useParams()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const [images, setImages] = useState<PropertyImage[]>(initialImages)
  const [pendingUploads, setPendingUploads] = useState<PendingUpload[]>([])
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set())
  const [imagesError, setImagesError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const activeCount = images.length + pendingUploads.filter((p) => !p.error).length

  async function handleSubmit(data: PropertyFormData) {
    setIsLoading(true)
    try {
      await updateProperty(id, data)
      void router.navigate({ to: '/imoveis' })
    } finally {
      setIsLoading(false)
    }
  }

  async function handleFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (files.length === 0) return

    setImagesError(null)
    let count = images.length

    for (const file of files) {
      if (count >= 20) break

      const tempId = `${Date.now()}-${Math.random().toString(36).slice(2)}`
      const previewUrl = URL.createObjectURL(file)
      setPendingUploads((prev) => [...prev, { tempId, previewUrl, error: null }])

      try {
        const newImage = await uploadPropertyImage(id, file, count)
        count += 1
        setImages((prev) => [...prev, newImage])
        setPendingUploads((prev) => prev.filter((p) => p.tempId !== tempId))
        URL.revokeObjectURL(previewUrl)
      } catch (err) {
        setPendingUploads((prev) =>
          prev.map((p) =>
            p.tempId === tempId
              ? { ...p, error: err instanceof Error ? err.message : 'Erro ao enviar foto' }
              : p,
          ),
        )
      }
    }
  }

  function dismissPendingUpload(tempId: string) {
    setPendingUploads((prev) => {
      const target = prev.find((p) => p.tempId === tempId)
      if (target) URL.revokeObjectURL(target.previewUrl)
      return prev.filter((p) => p.tempId !== tempId)
    })
  }

  async function handleDelete(image: PropertyImage) {
    setImagesError(null)
    setDeletingIds((prev) => new Set(prev).add(image.id))
    try {
      await deletePropertyImage(image.id, image.storagePath)
      setImages((prev) => prev.filter((img) => img.id !== image.id))
    } catch (err) {
      setImagesError(err instanceof Error ? err.message : 'Erro ao remover foto')
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev)
        next.delete(image.id)
        return next
      })
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
            bedrooms: property.bedrooms,
            bathrooms: property.bathrooms,
            suites: property.suites,
            parking_spots: property.parking_spots,
            published: property.published,
            featured: property.featured,
            slug: property.slug,
            operation_type: property.operation_type,
          }}
          onSubmit={(data) => handleSubmit(data)}
          isLoading={isLoading}
        />
      </div>

      <div className="mt-8 max-w-2xl">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Fotos do Imóvel</h2>

        {imagesError && (
          <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{imagesError}</div>
        )}

        {(images.length > 0 || pendingUploads.length > 0) && (
          <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
            {images.map((image) => (
              <div
                key={image.id}
                className="relative overflow-hidden rounded-lg border border-input"
              >
                <img src={image.url} alt="" className="aspect-square w-full object-cover" />
                {image.isMain && (
                  <span className="absolute left-2 top-2 rounded bg-primary px-1.5 py-0.5 text-xs font-medium text-primary-foreground">
                    Principal
                  </span>
                )}
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="absolute bottom-2 right-2"
                  disabled={deletingIds.has(image.id)}
                  onClick={() => { void handleDelete(image) }}
                >
                  {deletingIds.has(image.id) ? 'Removendo...' : 'Remover'}
                </Button>
              </div>
            ))}

            {pendingUploads.map((pending) => (
              <div
                key={pending.tempId}
                className="relative overflow-hidden rounded-lg border border-input"
              >
                <img
                  src={pending.previewUrl}
                  alt=""
                  className="aspect-square w-full object-cover opacity-60"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-xs font-medium text-white">
                  {pending.error ? 'Falha no envio' : 'Enviando...'}
                </div>
                {pending.error && (
                  <div className="absolute inset-x-0 bottom-0 space-y-1 bg-red-50 p-1.5 text-xs text-red-700">
                    <p>{pending.error}</p>
                    <button
                      type="button"
                      onClick={() => dismissPendingUpload(pending.tempId)}
                      className="underline"
                    >
                      Descartar
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <Button
          type="button"
          variant="outline"
          disabled={activeCount >= 20}
          onClick={() => fileInputRef.current?.click()}
        >
          Adicionar fotos
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={(e) => { void handleFilesSelected(e) }}
        />
        <p className="mt-1.5 text-xs text-gray-500">
          {activeCount}/20 fotos — JPG, PNG ou WebP, máx. 5MB cada
        </p>
      </div>
    </div>
  )
}
