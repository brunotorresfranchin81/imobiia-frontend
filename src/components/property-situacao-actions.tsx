import { useState } from 'react'
import { setPropertySituacao, deletePropertyPermanently } from '#/lib/properties'
import type { Property, PropertyStatus } from '#/lib/properties'
import { SITUACAO_LABELS, precisaConfirmar, situacoesPermitidas } from '#/lib/property-situacao'
import { ConfirmDialog } from '#/components/confirm-dialog'
import { Button } from '#/components/ui/button'

interface PropertySituacaoActionsProps {
  property: Pick<Property, 'id' | 'title' | 'status' | 'operation_type'>
  isAdmin: boolean
  size?: 'sm' | 'default'
  onSituacaoChanged: (situacao: PropertyStatus) => void
  /** warning = imóvel excluído, mas sobrou foto no bucket (aviso leve). */
  onDeleted: (warning: string | null) => void
}

export function PropertySituacaoActions({
  property,
  isAdmin,
  size = 'default',
  onSituacaoChanged,
  onDeleted,
}: PropertySituacaoActionsProps) {
  const current = property.status ?? 'disponivel'
  // vendido/alugado esperando confirmação; null = nada pendente
  const [pending, setPending] = useState<PropertyStatus | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Mantém a situação atual na lista mesmo se ela não combinar com o tipo de negócio.
  const options = situacoesPermitidas(property.operation_type)
  if (!options.includes(current)) options.unshift(current)

  async function applySituacao(next: PropertyStatus) {
    setIsLoading(true)
    setError(null)
    try {
      await setPropertySituacao(property, next)
      setPending(null)
      onSituacaoChanged(next)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado. Nada foi alterado.')
    } finally {
      setIsLoading(false)
    }
  }

  function handleSelect(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value as PropertyStatus
    if (next === current) return
    setError(null)
    if (precisaConfirmar(next)) {
      setPending(next)
    } else {
      void applySituacao(next)
    }
  }

  async function handleDelete() {
    setIsLoading(true)
    setError(null)
    try {
      const { warning } = await deletePropertyPermanently(property.id)
      setDeleteOpen(false)
      onDeleted(warning)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado. Nada foi alterado.')
    } finally {
      setIsLoading(false)
    }
  }

  const selectClass = size === 'sm'
    ? 'rounded-md border border-input bg-transparent px-2 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50'
    : 'rounded-lg border border-input bg-transparent px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50'

  return (
    <>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <label className="inline-flex items-center gap-2 text-sm text-gray-600">
          <span className={size === 'sm' ? 'sr-only' : undefined}>Situação</span>
          <select
            aria-label={`Situação de ${property.title}`}
            value={current}
            onChange={handleSelect}
            disabled={isLoading}
            className={selectClass}
          >
            {options.map((s) => (
              <option key={s} value={s}>{SITUACAO_LABELS[s]}</option>
            ))}
          </select>
        </label>
        {isAdmin && (
          <Button
            type="button"
            variant="destructive"
            size={size}
            onClick={() => { setError(null); setDeleteOpen(true) }}
          >
            Excluir de vez
          </Button>
        )}
      </div>

      {error && !pending && !deleteOpen && (
        <p role="alert" className="mt-1 text-right text-xs text-red-700">{error}</p>
      )}

      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(next) => { if (!next) setPending(null) }}
        title={pending ? `Marcar como ${SITUACAO_LABELS[pending]}?` : ''}
        description={pending ? `"${property.title}" continua visível no site com a etiqueta ${SITUACAO_LABELS[pending]}. Para tirar do ar, o administrador usa "Excluir de vez".` : undefined}
        confirmLabel={pending ? `Marcar como ${SITUACAO_LABELS[pending]}` : 'Confirmar'}
        isLoading={isLoading}
        error={error}
        onConfirm={() => { if (pending) void applySituacao(pending) }}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Excluir "${property.title}" de vez?`}
        description="Isso apaga o imóvel, as fotos, o histórico de preço, as visitas agendadas e o vínculo do imóvel com os clientes (leads), e o link do site deixa de existir. Posts já feitos no Instagram/Facebook continuam lá."
        confirmLabel="Excluir de vez"
        destructive
        isLoading={isLoading}
        error={error}
        onConfirm={() => { void handleDelete() }}
      />
    </>
  )
}
