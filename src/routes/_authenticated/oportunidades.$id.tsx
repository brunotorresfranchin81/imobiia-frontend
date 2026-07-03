import { useState } from 'react'
import { createFileRoute, Link, Outlet } from '@tanstack/react-router'
import { Sparkles } from 'lucide-react'
import { getLeadWithDetails, getStatusHistory } from '#/lib/leads'
import { qualifyLead, getLatestAiScore, generateSummary, getLatestSummary } from '#/lib/ai'
import { scoreToLabel } from '#/types/domain'
import type { AiQualification, AiScore, AiSummary } from '#/types/domain'
import type { LeadSource, LeadStatus } from '#/lib/leads'
import { Button } from '#/components/ui/button'

export const Route = createFileRoute('/_authenticated/oportunidades/$id')({
  loader: async ({ params }) => {
    const [lead, aiScore, summary, history] = await Promise.all([
      getLeadWithDetails(params.id),
      getLatestAiScore(params.id),
      getLatestSummary(params.id),
      getStatusHistory(params.id),
    ])
    return { lead, aiScore, summary, history }
  },
  pendingComponent: () => (
    <div className="p-8 text-sm text-muted-foreground">Carregando...</div>
  ),
  errorComponent: () => (
    <div className="p-8 text-sm text-destructive">
      Erro ao carregar oportunidade. Tente novamente.
    </div>
  ),
  component: OportunidadeDetailPage,
})

const SOURCE_LABELS: Record<LeadSource, string> = {
  site: 'Site',
  portal: 'Portal',
  indicacao: 'Indicação',
  outro: 'Outro',
}

const STATUS_LABELS: Record<LeadStatus, string> = {
  novo: 'Novo',
  qualificado: 'Qualificado',
  em_visita: 'Em Visita',
  proposta: 'Proposta',
  fechado: 'Fechado',
  perdido: 'Perdido',
}

const STATUS_COLORS: Record<LeadStatus, string> = {
  novo: 'bg-blue-100 text-blue-700',
  qualificado: 'bg-purple-100 text-purple-700',
  em_visita: 'bg-yellow-100 text-yellow-700',
  proposta: 'bg-orange-100 text-orange-700',
  fechado: 'bg-green-100 text-green-700',
  perdido: 'bg-red-100 text-red-700',
}

const AI_SCORE_COLORS: Record<AiScore, string> = {
  quente: 'bg-red-100 text-red-700 border-red-200',
  morno: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  frio: 'bg-blue-100 text-blue-700 border-blue-200',
}

const AI_SCORE_LABELS: Record<AiScore, string> = {
  quente: 'Quente',
  morno: 'Morno',
  frio: 'Frio',
}

function formatBudget(min: number | null, max: number | null) {
  const fmt = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
  if (min != null && max != null) return `${fmt(min)} – ${fmt(max)}`
  if (min != null) return `A partir de ${fmt(min)}`
  if (max != null) return `Até ${fmt(max)}`
  return '—'
}

function LeadInfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
      <span className="w-40 shrink-0 text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-900">{value || '—'}</span>
    </div>
  )
}

function ScoreCard({ qualification }: { qualification: AiQualification }) {
  const label = scoreToLabel(qualification.score)
  const scoreNum = Number(qualification.score)
  return (
    <div className={`rounded-lg border p-4 ${AI_SCORE_COLORS[label]}`}>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-semibold uppercase tracking-wide">
          Score IA — {AI_SCORE_LABELS[label]}
        </span>
        <span className="text-2xl font-bold">{scoreNum}/100</span>
      </div>
      <p className="mb-2 text-sm">{qualification.reasoning}</p>
      <p className="text-sm font-medium">
        <span className="opacity-70">Ação sugerida: </span>
        {qualification.suggestedAction}
      </p>
      <p className="mt-2 text-xs opacity-60">
        Gerado em {new Date(qualification.generatedAt).toLocaleString('pt-BR')}
      </p>
    </div>
  )
}

function SummaryCard({ summary }: { summary: AiSummary }) {
  return (
    <div className="rounded-lg border bg-gray-50 p-4">
      <p className="text-sm text-gray-700">{summary.content}</p>
      <p className="mt-2 text-xs text-gray-500">
        Gerado em {new Date(summary.generatedAt).toLocaleString('pt-BR')}
      </p>
    </div>
  )
}

function OportunidadeDetailPage() {
  const { lead, aiScore: initialAiScore, summary: initialSummary, history } = Route.useLoaderData()
  const [aiScore, setAiScore] = useState<AiQualification | null>(initialAiScore)
  const [isQualifying, setIsQualifying] = useState(false)
  const [qualifyError, setQualifyError] = useState<string | null>(null)
  const [summary, setSummary] = useState<AiSummary | null>(initialSummary)
  const [isSummarizing, setIsSummarizing] = useState(false)
  const [summarizeError, setSummarizeError] = useState<string | null>(null)

  async function handleQualify() {
    setIsQualifying(true)
    setQualifyError(null)
    try {
      const result = await qualifyLead(lead.id)
      setAiScore(result)
    } catch (err) {
      setQualifyError(err instanceof Error ? err.message : 'Erro ao qualificar lead')
    } finally {
      setIsQualifying(false)
    }
  }

  async function handleSummarize() {
    setIsSummarizing(true)
    setSummarizeError(null)
    try {
      const result = await generateSummary(lead.id)
      setSummary(result)
    } catch (err) {
      setSummarizeError(err instanceof Error ? err.message : 'Erro ao gerar resumo')
    } finally {
      setIsSummarizing(false)
    }
  }

  const statusLabel = (s: string | null): string =>
    s ? (STATUS_LABELS[s as LeadStatus] ?? s) : '—'

  return (
    <>
      <div className="p-6 sm:p-8">
        <div className="mb-6 flex flex-wrap items-center gap-4">
          <Link
            to="/oportunidades"
            className="shrink-0 text-sm text-gray-500 hover:text-gray-700"
          >
            ← Oportunidades
          </Link>
          <h1 className="min-w-0 truncate text-2xl font-bold text-gray-900">
            {lead.full_name}
          </h1>
          {lead.status && (
            <span
              className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[lead.status]}`}
            >
              {STATUS_LABELS[lead.status]}
            </span>
          )}
          <Link
            to="/oportunidades/$id/editar"
            params={{ id: lead.id }}
            className="ml-auto text-sm font-medium text-[#0E3A52] hover:underline"
          >
            Editar
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg border bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
              Dados do Lead
            </h2>
            <div className="flex flex-col gap-3">
              <LeadInfoRow label="E-mail" value={lead.email} />
              <LeadInfoRow label="Telefone" value={lead.phone} />
              <LeadInfoRow label="Corretor" value={lead.corretor_name ?? '—'} />
              <LeadInfoRow
                label="Origem"
                value={lead.source ? SOURCE_LABELS[lead.source] : null}
              />
              <LeadInfoRow
                label="Orçamento"
                value={formatBudget(lead.budget_min, lead.budget_max)}
              />
              <LeadInfoRow
                label="Bairros preferidos"
                value={
                  lead.preferred_neighborhoods?.length
                    ? lead.preferred_neighborhoods.join(', ')
                    : null
                }
              />
              {lead.notes && (
                <div className="mt-1 rounded-md bg-gray-50 p-3 text-sm text-gray-700">
                  {lead.notes}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="rounded-lg border bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
                Qualificação com IA
              </h2>

              {aiScore ? (
                <ScoreCard qualification={aiScore} />
              ) : (
                <p className="mb-4 text-sm text-gray-500">
                  Nenhuma qualificação gerada ainda.
                </p>
              )}

              {qualifyError && (
                <p className="mb-3 mt-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
                  {qualifyError}
                </p>
              )}

              <Button
                onClick={handleQualify}
                disabled={isQualifying}
                className="mt-4 gap-2"
              >
                <Sparkles className="h-4 w-4" />
                {isQualifying ? 'Qualificando...' : 'Qualificar com IA'}
              </Button>
            </div>

            <div className="rounded-lg border bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
                Resumo Inteligente
              </h2>

              {summary ? (
                <SummaryCard summary={summary} />
              ) : (
                <p className="mb-4 text-sm text-gray-500">
                  Nenhum resumo gerado ainda.
                </p>
              )}

              {summarizeError && (
                <p className="mb-3 mt-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
                  {summarizeError}
                </p>
              )}

              <Button
                onClick={handleSummarize}
                disabled={isSummarizing}
                className="mt-4 gap-2"
              >
                <Sparkles className="h-4 w-4" />
                {isSummarizing
                  ? 'Gerando...'
                  : summary
                    ? 'Atualizar Resumo'
                    : 'Gerar Resumo'}
              </Button>
            </div>
          </div>
        </div>

        <section className="mt-6 rounded-lg border bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
            Histórico de Status
          </h2>
          {history.length === 0 ? (
            <p className="text-sm text-gray-500">
              Nenhum histórico registrado para este lead.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {history.map(entry => (
                <li key={entry.id} className="flex flex-col gap-0.5 border-l-2 border-gray-200 pl-3">
                  <span className="text-sm font-medium text-gray-900">
                    {entry.oldStatus === null
                      ? `Lead criado como ${statusLabel(entry.newStatus)}`
                      : `${statusLabel(entry.oldStatus)} → ${statusLabel(entry.newStatus)}`}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(entry.changedAt).toLocaleString('pt-BR')}
                    {entry.changedBy && ` · ${entry.changedBy.full_name}`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <Outlet />
    </>
  )
}
