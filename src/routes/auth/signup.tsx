import { useState, useEffect } from 'react'
import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { signUp } from '#/lib/auth'
import { useAuth } from '#/hooks/useAuth'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'

export const Route = createFileRoute('/auth/signup')({ component: SignUpPage })

function SignUpPage() {
  const navigate = useNavigate()
  const { isAuthenticated, loading } = useAuth()
  const [fullName, setFullName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [confirmError, setConfirmError] = useState('')

  useEffect(() => {
    if (!loading && isAuthenticated) {
      void navigate({ to: '/dashboard' })
    }
  }, [loading, isAuthenticated, navigate])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrorMsg('')
    setConfirmError('')

    if (fullName.trim().length < 3) {
      setErrorMsg('Nome completo deve ter pelo menos 3 caracteres.')
      return
    }
    if (companyName.trim().length < 3) {
      setErrorMsg('Nome da empresa deve ter pelo menos 3 caracteres.')
      return
    }
    if (password.length < 6) {
      setErrorMsg('A senha deve ter pelo menos 6 caracteres.')
      return
    }
    if (password !== confirmPassword) {
      setConfirmError('As senhas não coincidem.')
      return
    }

    setSubmitting(true)
    const { error } = await signUp(email, password, fullName.trim(), companyName.trim())
    if (error) {
      setErrorMsg('Não foi possível criar a conta. Verifique os dados e tente novamente.')
      setSubmitting(false)
    } else {
      void navigate({ to: '/dashboard' })
    }
  }

  if (loading) return null

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-primary">IMOBIIA</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => { void handleSubmit(e) }} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="fullName">Nome completo</Label>
              <Input
                id="fullName"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Seu nome completo"
                autoComplete="name"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="companyName">Nome da empresa</Label>
              <Input
                id="companyName"
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Nome da sua imobiliária"
                autoComplete="organization"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                autoComplete="email"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="confirmPassword">Confirmar senha</Label>
              <Input
                id="confirmPassword"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••"
                autoComplete="new-password"
              />
              {confirmError && (
                <p className="text-sm text-destructive">{confirmError}</p>
              )}
            </div>
            {errorMsg && (
              <p className="text-sm text-destructive">{errorMsg}</p>
            )}
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Criando conta...' : 'Criar conta'}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Já tem conta?{' '}
              <Link to="/auth/login" className="text-primary underline-offset-4 hover:underline">
                Entrar
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
