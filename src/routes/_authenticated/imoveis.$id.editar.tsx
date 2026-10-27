import { useEffect, useRef, useState } from 'react'
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
  getCompanyAutoPublish,
  DuplicatePostError,
  AutoPublishConfirmationRequiredError,
  generatePropertyCaption,
} from '#/lib/social-posts'
import type { PostQueueItem } from '#/lib/social-posts'
import { describePostStatus, isPostInFlight } from '#/lib/post-status'
import type { PostStatusTone } from '#/lib/post-status'
import { getInstagramAspectRatioWarning, loadImageDimensions } from '#/lib/social-image'
import type { ImageDimensions } from '#/lib/social-image'
import { useAuth } from '#/hooks/useAuth'
import { PropertyForm } from '#/components/property-form'
import { ConfirmDialog } from '#/components/confirm-dialog'
import { PropertyCloseActions } from '#/components/property-close-actions'
import { Button } from '#/components/ui/button'

interface PendingUpload {
  tempId: string
  previewUrl: string
  error: string | null
}

const POST_TONE_CLASSES: Record<PostStatusTone, string> = {
  neutral: 'text-gray-500',
  progress: 'text-blue-600',
  success: 'text-green-700',
  warning: 'text-amber-700',
  error: 'text-red-700',
}

// O n8n leva ~15-20s pra publicar (polling do container do IG). Reconsulta
// até ~3 min; depois disso o corretor recarrega a página.
const POST_POLL_INTERVAL_MS = 5000
const POST_POLL_MAX_ATTEMPTS = 36

export const Route = createFileRoute('/_authenticated/imoveis/$id/editar')({
  loader: async ({ params }) => {
    const [property, images, postQueue, autoPublish] = await Promise.all([
      getPropertyById(params.id),
      listPropertyImages(params.id),
      listPostQueueByProperty(params.id),
      getCompanyAutoPublish(),
    ])
    return { property, images, postQueue, autoPublish }
  },
  component: ImoveisEditarPage,
})

function ImoveisEditarPage() {
  const {
    property,
    images: initialImages,
    postQueue: initialPostQueue,
    autoPublish: initialAutoPublish,
  } = Route.useLoaderData()
  const { id } = Route.useParams()
  const router = useRouter()
  const { claims } = useAuth()
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
  const [postSuccess, setPostSuccess] = useState<string | null>(null)
  const [republishPrompt, setRepublishPrompt] = useState<string | null>(null)
  const [autoPublish, setAutoPublish] = useState(initialAutoPublish)
  const [autoPublishModalOpen, setAutoPublishModalOpen] = useState(false)

  // Acompanha os posts que o n8n está publicando até virarem published/failed.
  const hasPostInFlight = postQueue.some((post) => isPostInFlight(post.status))
  useEffect(() => {
    if (!hasPostInFlight) return
    let attempts = 0
    const timer = setInterval(() => {
      attempts += 1
      if (attempts > POST_POLL_MAX_ATTEMPTS) {
        clearInterval(timer)
        return
      }
      listPostQueueByProperty(id)
        .then(setPostQueue)
        .catch(() => {
          // falha pontual de rede: tenta de novo no próximo tick
        })
    }, POST_POLL_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [hasPostInFlight, id])

  const activeCount = images.length + pendingUploads.filter((p) => !p.error).length

  // Proporção da foto escolhida: o Instagram só aceita 0,8 a 1,91. Só avisa, não bloqueia.
  const selectedImage = images.find((img) => img.id === selectedImageId) ?? null
  const selectedImageUrl = selectedImage?.url ?? null
  const [measured, setMeasured] = useState<{ url: string; dimensions: ImageDimensions } | null>(null)

  useEffect(() => {
    if (!selectedImageUrl) return
    let cancelled = false
    loadImageDimensions(selectedImageUrl)
      .then((dimensions) => {
        if (!cancelled) setMeasured({ url: selectedImageUrl, dimensions })
      })
      .catch(() => {
        // sem medida, sem aviso: o n8n ainda trata a proporção inválida no envio
      })
    return () => {
      cancelled = true
    }
  }, [selectedImageUrl])

  const ratioWarning =
    measured && measured.url === selectedImageUrl
      ? getInstagramAspectRatioWarning(measured.dimensions)
      : null

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

  function handlePostClick() {
    setPostError(null)
    setPostSuccess(null)
    setRepublishPrompt(null)
    if (autoPublish) {
      setAutoPublishModalOpen(true)
      return
    }
    void handlePostToSocial()
  }

  // confirmedAutoPublish só é true quando o usuário passou pelo modal "Publicar agora".
  async function handlePostToSocial(confirmRepublish = false, confirmedAutoPublish = false) {
    if (!selectedImageId) return
    const image = images.find((img) => img.id === selectedImageId)
    if (!image) return

    setPostError(null)
    setPostSuccess(null)
    setRepublishPrompt(null)
    setIsPosting(true)
    let reopenModal = false
    try {
      const { post, autoPublished } = await requestSocialPost(
        { propertyId: id, caption, imageUrl: image.url },
        { confirmRepublish, confirmedAutoPublish },
      )
      setPostQueue((prev) => [post, ...prev])
      setPostSuccess(
        autoPublished
          ? 'Publicando no Instagram/Facebook. O status abaixo atualiza sozinho.'
          : 'Enviado para aprovação do Vagner no WhatsApp.',
      )
    } catch (err) {
      if (err instanceof DuplicatePostError && err.duplicate.kind === 'published' && !confirmRepublish) {
        setRepublishPrompt(err.message)
        return
      }
      if (err instanceof AutoPublishConfirmationRequiredError) {
        // a empresa passou a publicar direto depois que a página carregou
        setAutoPublish(true)
        reopenModal = true
        return
      }
      setPostError(err instanceof Error ? err.message : 'Erro ao enviar o post')
    } finally {
      setIsPosting(false)
      setAutoPublishModalOpen(reopenModal)
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
            {autoPublish
              ? 'Escolha a foto e a legenda. Depois de confirmar, o post sai direto no Instagram/Facebook, sem aprovação pelo WhatsApp.'
              : 'Escolha a foto e a legenda. O post fica em aprovação com o Vagner pelo WhatsApp antes de sair no ar — nada é publicado automaticamente.'}
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

          {ratioWarning && (
            <div
              role="status"
              className="mb-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"
            >
              {ratioWarning}
            </div>
          )}

          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            rows={12}
            maxLength={2200}
            className="mb-3 w-full rounded-md border border-input px-3 py-2 text-sm"
            placeholder="Legenda do post..."
          />

          {postError && (
            <div className="mb-3 rounded-md bg-red-50 p-3 text-sm text-red-700">{postError}</div>
          )}
          {republishPrompt && (
            <div className="mb-3 rounded-md bg-amber-50 p-3 text-sm text-amber-800">
              <p>{republishPrompt} Quer publicar de novo?</p>
              <div className="mt-2 flex gap-2">
                <Button type="button" size="sm" disabled={isPosting} onClick={() => { void handlePostToSocial(true, autoPublish) }}>
                  Confirmar
                </Button>
                <Button type="button" size="sm" variant="outline" disabled={isPosting} onClick={() => setRepublishPrompt(null)}>
                  Cancelar
                </Button>
              </div>
            </div>
          )}
          {postSuccess && (
            <div className="mb-3 rounded-md bg-green-50 p-3 text-sm text-green-700">{postSuccess}</div>
          )}

          <Button
            type="button"
            disabled={!selectedImageId || !caption.trim() || isPosting}
            onClick={handlePostClick}
          >
            {isPosting ? 'Enviando...' : 'Postar no Instagram/Facebook'}
          </Button>

          <ConfirmDialog
            open={autoPublishModalOpen}
            onOpenChange={setAutoPublishModalOpen}
            title="Publicar no Instagram/Facebook?"
            description="O post sai agora, sem aprovação pelo WhatsApp."
            confirmLabel="Publicar agora"
            isLoading={isPosting}
            onConfirm={() => { void handlePostToSocial(false, true) }}
          >
            {selectedImageUrl && (
              <img src={selectedImageUrl} alt="" className="mb-3 max-h-64 w-full rounded-md object-contain" />
            )}
            {ratioWarning && <p className="mb-3 text-sm text-amber-700">{ratioWarning}</p>}
            <p className="max-h-48 overflow-y-auto whitespace-pre-wrap rounded-md border border-input p-3 text-sm text-gray-700">
              {caption}
            </p>
          </ConfirmDialog>

          {postQueue.length > 0 && (
            <div className="mt-4 space-y-1.5">
              <h3 className="text-sm font-medium text-gray-700">Histórico de posts deste imóvel</h3>
              {postQueue.map((post) => {
                const view = describePostStatus(post)
                return (
                  <div key={post.id} className="rounded-md border border-input px-3 py-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="truncate text-gray-600">{post.caption}</span>
                      <span className={`ml-3 shrink-0 text-xs font-medium ${POST_TONE_CLASSES[view.tone]}`}>
                        {view.label}
                      </span>
                    </div>
                    {view.detail && (
                      <p className={`mt-1 text-xs ${POST_TONE_CLASSES[view.tone]}`}>{view.detail}</p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      <div className="mt-8 max-w-2xl border-t pt-6">
        <h2 className="mb-1 text-lg font-semibold text-gray-900">Encerrar imóvel</h2>
        <p className="mb-4 text-sm text-gray-500">
          Fechou com outra corretora? Arquive para tirar do site sem perder o histórico.
          {claims?.role === 'admin' && ' "Excluir de vez" apaga tudo e não pode ser desfeito.'}
        </p>
        <div className="flex">
          <PropertyCloseActions
            property={property}
            isAdmin={claims?.role === 'admin'}
            onArchived={() => { void router.navigate({ to: '/imoveis' }) }}
            onDeleted={(warning) => {
              void router.navigate({ to: '/imoveis', search: warning ? { aviso: warning } : {} })
            }}
          />
        </div>
      </div>
    </div>
  )
}
