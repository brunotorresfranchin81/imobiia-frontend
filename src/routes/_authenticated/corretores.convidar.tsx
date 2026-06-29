import { useState } from 'react'
import { createFileRoute, Link, redirect, useRouter } from '@tanstack/react-router'
import { getAuthClaims } from '#/lib/auth'
import { inviteCorretor } from '#/lib/corretores'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'

export const Route = createFileRoute('/_authenticated/corretores/convidar')({
  beforeLoad: async () => {
    const claims = await getAuthClaims()
    if (claims?.role !== 'admin' && claims?.role !== 'gestor') {
      throw redirect({ to: '/corretores' })
    }
  },
  component: CorretoresConvidarPage,
})

function CorretoresConvidarPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      await inviteCorretor(email, fullName)
      setSuccess(true)
      setTimeout(() => {
        void router.navigate({ to: '/corretores' })
      }, 1500)
    } catch (err) {
      if (err instanceof Error && err.message.includes('409')) {
        setError('Este email já está cadastrado')
      } else if (
        err !== null &&
        typeof err === 'object' &&
        'context' in err &&
        (err as { context?: string }).context === 'corretores.invite'
      ) {
        const cause = (err as { cause?: unknown }).cause
        if (
          cause !== null &&
          typeof cause === 'object' &&
          'status' in cause &&
          (cause as { status?: number }).status === 409
        ) {
          setError('Este email já está cadastrado')
        } else {
          setError('Erro ao enviar convite. Tente novamente.')
        }
      } else {
        setError('Erro ao enviar convite. Tente novamente.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="p-6 sm:p-8">
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <Link to="/corretores" className="shrink-0 text-sm text-gray-500 hover:text-gray-700">
          ← Corretores
        </Link>
        <h1 className="min-w-0 text-2xl font-bold text-gray-900">Convidar Corretor</h1>
      </div>

      <div className="max-w-md">
        {success ? (
          <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
            Convite enviado com sucesso!
          </div>
        ) : (
          <form onSubmit={(e) => { void handleSubmit(e) }} className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="fullName" className="text-sm font-medium text-gray-700">
                Nome Completo
              </label>
              <Input
                id="fullName"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="João da Silva"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="email" className="text-sm font-medium text-gray-700">
                Email
              </label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="joao@imobiliaria.com"
              />
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? 'Enviando convite...' : 'Enviar Convite'}
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
