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
import {
  requestSocialPost,
  listPostQueueByProperty,
  generatePropertyCaption,
  POST_QUEUE_STATUS_LABELS,
} from '#/lib/social-posts'
import type { PostQueueItem } from '#/lib/social-posts'
import { PropertyForm } from '#/components/property-form'
import { Button } from '#/components/ui/button'

interface PendingUpload {
  tempId: string
  previewUrl: string
  error: string | null
}

export const Route = createFileRoute('/_authenticated/imoveis/$id/editar')({
  loader: async ({ params }) => {
    const [property, images, postQueue] = await Promise.all([
      getPropertyById(params.id),
      listPropertyImages(params.id),
      listPostQueueByProperty(params.id),
    ])
    return { property, images, postQueue }
  },
  component: ImoveisEditarPage,
})

function ImoveisEditarPage() {
  const { property, images: initialImages, postQueue: initialPostQueue } = Route.useLoaderData()
  const { id } = Route.useParams()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const [images, setImages] = useState<PropertyImage[]>(initialImages)
  const [pendingUploads, setPendingUploads] = useState<PendingUpload[]>([])
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set())
  const [imagesError, setImagesError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [postQueue, setPostQueue] = useState<PostQueueItem[]>(initialPostQueue)
  const [selectedImageId, setSelectedImageId] = useState<string | null>(
    initialImages.find((img) => img.isMain)?.id ?? initialImages[0]?.id ?? null,
  )
  const [caption, setCaption] = useState(() => generatePropertyCaption(property))
  const [isPosting, setIsPosting] = useState(false)
  const [postError, setPostError] = useState<string | null>(null)
  const [postSuccess, setPostSuccess] = useState(false)

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

  async function handlePostToSocial() {
    if (!selectedImageId) return
    const image = images.find((img) => img.id === selectedImageId)
    if (!image) return

    setPostError(null)
    setPostSuccess(false)
    setIsPosting(true)
    try {
      const created = await requestSocialPost({
        propertyId: id,
        caption,
        imageUrl: image.url,
      })
      setPostQueue((prev) => [created, ...prev])
      setPostSuccess(true)
    } catch (err) {
      setPostError(err instanceof Error ? err.message : 'Erro ao enviar para aprovação')
    } finally {
      setIsPosting(false)
    }
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
            state: property.state,
            zip_code: property.zip_code,
            property_type: property.property_type,
            status: property.status,
            area_m2: property.area_m2 != null ? String(property.area_m2) : '',
            price: property.price != null ? String(Number(property.price)) : '',
            condominio_valor: property.condominio_valor != null ? String(Number(property.condominio_valor)) : '',
            iptu_valor: property.iptu_valor != null ? String(Number(property.iptu_valor)) : '',
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

      {images.length > 0 && (
        <div className="mt-8 max-w-2xl">
          <h2 className="mb-1 text-lg font-semibold text-gray-900">Instagram / Facebook</h2>
          <p className="mb-4 text-sm text-gray-500">
            Escolha a foto e a legenda. O post fica em aprovação com o Vagner pelo WhatsApp
            antes de sair no ar — nada é publicado automaticamente.
          </p>

          <div className="mb-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
            {images.map((image) => (
              <button
                key={image.id}
                type="button"
                onClick={() => setSelectedImageId(image.id)}
                className={`overflow-hidden rounded-lg border-2 ${
                  selectedImageId === image.id ? 'border-primary' : 'border-transparent'
                }`}
              >
                <img src={image.url} alt="" className="aspect-square w-full object-cover" />
              </button>
            ))}
          </div>

          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            rows={4}
            maxLength={2200}
            className="mb-3 w-full rounded-md border border-input px-3 py-2 text-sm"
            placeholder="Legenda do post..."
          />

          {postError && (
            <div className="mb-3 rounded-md bg-red-50 p-3 text-sm text-red-700">{postError}</div>
          )}
          {postSuccess && (
            <div className="mb-3 rounded-md bg-green-50 p-3 text-sm text-green-700">
              Enviado para aprovação do Vagner no WhatsApp.
            </div>
          )}

          <Button
            type="button"
            disabled={!selectedImageId || !caption.trim() || isPosting}
            onClick={() => { void handlePostToSocial() }}
          >
            {isPosting ? 'Enviando...' : 'Postar no Instagram/Facebook'}
          </Button>

          {postQueue.length > 0 && (
            <div className="mt-4 space-y-1.5">
              <h3 className="text-sm font-medium text-gray-700">Histórico de posts deste imóvel</h3>
              {postQueue.map((post) => (
                <div key={post.id} className="flex items-center justify-between rounded-md border border-input px-3 py-2 text-sm">
                  <span className="truncate text-gray-600">{post.caption}</span>
                  <span className="ml-3 shrink-0 text-xs text-gray-500">
                    {POST_QUEUE_STATUS_LABELS[post.status] ?? post.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
