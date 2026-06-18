import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/oportunidades')({
  component: OportunidadesPage,
})

function OportunidadesPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Oportunidades</h1>
      <p className="mt-2 text-muted-foreground">Em breve</p>
    </div>
  )
}
