import { useState } from 'react'
import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { Users } from 'lucide-react'
import { listCorretores, toggleCorretorActive, ROLE_LABELS } from '#/lib/corretores'
import { useAuth } from '#/hooks/useAuth'
import { Button } from '#/components/ui/button'

export const Route = createFileRoute('/_authenticated/corretores/')({
  loader: () => listCorretores(),
  pendingComponent: () => (
    <div className="p-8 text-sm text-muted-foreground">Carregando...</div>
  ),
  errorComponent: () => (
    <div className="p-8 text-sm text-destructive">
      Erro ao carregar corretores. Tente novamente.
    </div>
  ),
  component: CorretoresIndexPage,
})

function CorretoresIndexPage() {
  const corretores = Route.useLoaderData()
  const { claims } = useAuth()
  const router = useRouter()
  const [toggling, setToggling] = useState<string | null>(null)

  const canManage = claims?.role === 'admin' || claims?.role === 'gestor'

  async function handleToggle(id: string, active: boolean | null) {
    setToggling(id)
    try {
      await toggleCorretorActive(id, !active)
      await router.invalidate()
    } finally {
      setToggling(null)
    }
  }

  return (
    <div className="p-6 sm:p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Corretores</h1>
        {canManage && (
          <Button asChild>
            <Link to="/corretores/convidar">Convidar Corretor</Link>
          </Button>
        )}
      </div>

      {corretores.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-20 text-center">
          <Users className="mb-4 h-12 w-12 text-gray-300" />
          <p className="text-base font-medium text-gray-500">
            Nenhum corretor cadastrado
          </p>
          {canManage && (
            <p className="mt-1 text-sm text-gray-400">
              Clique em &quot;Convidar Corretor&quot; para começar
            </p>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Nome
                </th>
                <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 sm:table-cell">
                  Função
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Status
                </th>
                {canManage && (
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                    Ações
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {corretores.map((corretor) => (
                <tr key={corretor.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {corretor.full_name}
                  </td>
                  <td className="hidden px-4 py-3 text-sm text-gray-600 sm:table-cell">
                    {ROLE_LABELS[corretor.role] ?? corretor.role}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        corretor.active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {corretor.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  {canManage && (
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        disabled={toggling === corretor.id}
                        onClick={() => { void handleToggle(corretor.id, corretor.active) }}
                        className="text-sm font-medium text-[#0E3A52] hover:underline disabled:opacity-50"
                      >
                        {toggling === corretor.id
                          ? '...'
                          : corretor.active
                            ? 'Desativar'
                            : 'Ativar'}
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
