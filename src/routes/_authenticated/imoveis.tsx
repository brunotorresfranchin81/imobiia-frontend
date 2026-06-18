import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/imoveis')({
  component: ImoveisPage,
})

function ImoveisPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Imóveis</h1>
      <p className="mt-2 text-muted-foreground">Em breve</p>
    </div>
  )
}
