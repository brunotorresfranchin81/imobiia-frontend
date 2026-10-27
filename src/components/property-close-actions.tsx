import { useState } from 'react'
import { archiveProperty, deletePropertyPermanently } from '#/lib/properties'
import type { Property } from '#/lib/properties'
import { ConfirmDialog } from '#/components/confirm-dialog'
import { Button } from '#/components/ui/button'

type Action = 'archive' | 'delete'

interface PropertyCloseActionsProps {
  property: Pick<Property, 'id' | 'title' | 'status'>
  isAdmin: boolean
  size?: 'sm' | 'default'
  onArchived: () => void
  /** warning = imóvel excluído, mas sobrou foto no bucket (aviso leve). */
  onDeleted: (warning: string | null) => void
}

export function PropertyCloseActions({ property, isAdmin, size = 'default', onArchived, onDeleted }: PropertyCloseActionsProps) {
  const [action, setAction] = useState<Action | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function open(next: Action) {
    setError(null)
    setAction(next)
  }

  async function handleConfirm() {
    if (!action) return
    setIsLoading(true)
    setError(null)
    try {
      if (action === 'archive') {
        await archiveProperty(property.id)
        setAction(null)
        onArchived()
      } else {
        const { warning } = await deletePropertyPermanently(property.id)
        setAction(null)
        onDeleted(warning)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado. Nada foi alterado.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <div className="flex flex-wrap justify-end gap-2">
        {property.status !== 'arquivado' && (
          <Button type="button" variant="outline" size={size} onClick={() => open('archive')}>
            Fechado com outra corretora
          </Button>
        )}
        {isAdmin && (
          <Button type="button" variant="destructive" size={size} onClick={() => open('delete')}>
            Excluir de vez
          </Button>
        )}
      </div>

      <ConfirmDialog
        open={action === 'archive'}
        onOpenChange={(next) => { if (!next) setAction(null) }}
        title="Fechado com outra corretora"
        description={`"${property.title}" será arquivado e sai do site. Ele continua no CRM e pode ser reativado mudando o status.`}
        confirmLabel="Arquivar"
        isLoading={isLoading}
        error={error}
        onConfirm={() => { void handleConfirm() }}
      />

      <ConfirmDialog
        open={action === 'delete'}
        onOpenChange={(next) => { if (!next) setAction(null) }}
        title={`Excluir "${property.title}" de vez?`}
        description="Isso apaga o imóvel, as fotos, o histórico de preço, as visitas agendadas e o vínculo do imóvel com os clientes (leads), e o link do site deixa de existir. Posts já feitos no Instagram/Facebook continuam lá."
        confirmLabel="Excluir de vez"
        destructive
        isLoading={isLoading}
        error={error}
        onConfirm={() => { void handleConfirm() }}
      />
    </>
  )
}
