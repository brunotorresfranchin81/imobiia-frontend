import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/corretores')({
  component: CorretoresPage,
})

function CorretoresPage() {
  return (
    <div className="p-4 md:p-8">
      <h1 className="text-2xl font-bold text-gray-900">Corretores</h1>
      <p className="mt-1 text-sm text-muted-foreground">Em breve.</p>
    </div>
  )
}
