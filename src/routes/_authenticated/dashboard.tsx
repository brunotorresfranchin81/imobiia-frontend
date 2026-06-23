import { createFileRoute } from '@tanstack/react-router'
import { Building2, Target } from 'lucide-react'
import { useAuth } from '#/hooks/useAuth'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'

export const Route = createFileRoute('/_authenticated/dashboard')({
  component: DashboardPage,
})

function DashboardPage() {
  const { claims } = useAuth()

  return (
    <div className="p-4 space-y-4 md:p-8 md:space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Visão Geral</h1>
        <p className="mt-1 text-muted-foreground">{claims?.email ?? '—'}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Imóveis ativos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-4xl font-bold text-primary">0</span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Oportunidades em aberto
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-4xl font-bold text-primary">0</span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Corretores ativos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-4xl font-bold text-primary">0</span>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Imóveis recentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
                <Building2 className="mb-3 h-10 w-10 opacity-40" />
                <p className="font-medium">Nenhum imóvel cadastrado ainda</p>
                <p className="text-sm">Cadastre o primeiro imóvel para começar</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Oportunidades recentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
                <Target className="mb-3 h-10 w-10 opacity-40" />
                <p className="font-medium">Nenhuma oportunidade registrada ainda</p>
                <p className="text-sm">Adicione a primeira oportunidade para começar</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
