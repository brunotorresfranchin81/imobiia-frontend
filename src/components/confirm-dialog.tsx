import type { ReactNode } from 'react'
import { Dialog } from 'radix-ui'
import { Button } from '#/components/ui/button'

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: ReactNode
  children?: ReactNode
  confirmLabel: string
  cancelLabel?: string
  destructive?: boolean
  isLoading?: boolean
  error?: string | null
  onConfirm: () => void
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  confirmLabel,
  cancelLabel = 'Cancelar',
  destructive = false,
  isLoading = false,
  error,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={(next) => { if (!isLoading) onOpenChange(next) }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg bg-white p-6 shadow-lg">
          <Dialog.Title className="text-lg font-semibold text-gray-900">{title}</Dialog.Title>
          {description ? (
            <Dialog.Description className="mt-2 text-sm text-gray-600">{description}</Dialog.Description>
          ) : (
            <Dialog.Description className="sr-only">{title}</Dialog.Description>
          )}

          {children && <div className="mt-4">{children}</div>}

          {error && (
            <div className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
          )}

          <div className="mt-6 flex justify-end gap-2">
            <Dialog.Close asChild>
              <Button type="button" variant="outline" disabled={isLoading}>
                {cancelLabel}
              </Button>
            </Dialog.Close>
            <Button
              type="button"
              variant={destructive ? 'destructive' : 'default'}
              disabled={isLoading}
              onClick={onConfirm}
            >
              {isLoading ? 'Aguarde...' : confirmLabel}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
