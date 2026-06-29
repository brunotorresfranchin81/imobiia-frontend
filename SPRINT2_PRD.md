# IMOBIIA — PRD + Backlog Sprint 2
**Versão:** 1.0  
**Data:** 2026-06-28  
**Projeto:** IMOBIIA | Norma IA  
**Função:** PMO e Arquiteto de Produto  
**Entrada:** Architecture Master Document v1.0 + Decisões do PO aprovadas

---

## Índice

1. [Visão do Sprint 2](#1-visão-do-sprint-2)
2. [Tasks do Sprint 2 — Especificação Detalhada](#2-tasks-do-sprint-2)
3. [Backlog Estruturado](#3-backlog-estruturado)
4. [Migrations SQL Completas](#4-migrations-sql-completas)
5. [Plano de Execução para o Claude Code](#5-plano-de-execução-para-o-claude-code)
6. [Checkpoints de Revisão](#6-checkpoints-de-revisão)

---

> **Clarificação de dependência (AMD Risco):** As Tasks 2.2.1 e 2.2.2 são listadas antes de
> 2.3.1 porque entregam a **camada de serviço** (Edge Functions, data layer, tipos, migrations)
> independentemente da UI. A página de detalhes (2.3.1) é quem integra os botões de IA. Portanto,
> a ordem de execução real do Claude Code para a camada UI é: 2.3.1 base → add 2.2.1 UI →
> add 2.2.2 UI → add 2.3.2 timeline. Isso está refletido na Seção 5 (Prompts Claude Code).

---

## 1. Visão do Sprint 2

### Objetivo

Transformar o IMOBIIA de um CRM funcional básico em um **CRM com inteligência artificial integrada**,
demonstrando automação, IA aplicada a negócios e arquitetura de produto escalável — os diferenciais
que a Norma IA vende para seus clientes.

### O que o Sprint 2 entrega

| Capacidade | Antes do Sprint 2 | Após o Sprint 2 |
|-----------|------------------|----------------|
| Dashboard | Placeholder estático | KPIs reais do Supabase + gráfico recharts |
| Corretores | Listagem read-only | CRUD completo + convite por e-mail |
| Oportunidades | Lista + formulário | Lista + formulário + página de detalhes + AI qualifier + AI summary |
| IA | Ausente | Score quente/morno/frio + resumo executivo com histórico |
| Histórico | Ausente | Timeline de mudanças de status por oportunidade |
| Arquitetura | 3 round-trips por operação | 1 round-trip (JWT claims) |

### Critérios de sucesso do Sprint 2

- [ ] Dashboard carrega métricas reais em menos de 2 segundos com dados de demo
- [ ] Corretor pode ser convidado por e-mail e aparece na listagem em até 5 minutos
- [ ] "Qualificar com IA" retorna score em menos de 10 segundos (latência Claude API)
- [ ] "Gerar resumo" retorna texto em menos de 15 segundos
- [ ] Histórico de status exibe a linha do tempo correta após mudança
- [ ] `tsc --noEmit` limpo após cada task
- [ ] Todas as novas rotas têm `pendingComponent` e `errorComponent`

### O que o Sprint 2 demonstra para clientes da Norma IA

- **Para CRM**: CRM com IA que qualifica leads automaticamente — reduz tempo de triagem do corretor
- **Para agências**: Dashboard analítico pronto que pode ser adaptado para qualquer vertical
- **Para RH**: Fluxo de convite de usuários sem admin manual — padrão replicável
- **Para investidores**: Que a Norma IA produz produtos com IA real (Claude), não "powered by AI" genérico
- **Para parceiros técnicos**: Arquitetura limpa (Edge Functions, RLS, JWT claims) que escala

### Módulos norma-lib gerados no Sprint 2

| Módulo | Task origem | Reutilizável em |
|--------|-------------|----------------|
| `norma-dashboard` | 2.1.1 | Todo CRM da Norma IA |
| `norma-team-management` | 2.1.2 | Qualquer produto multi-usuário |
| `norma-ai-qualifier` | 2.2.1 | Qualquer funil de vendas |
| `norma-ai-summarizer` | 2.2.2 | Qualquer entidade de negócio |

---

## 2. Tasks do Sprint 2

### Task 2.0.1 — Refatoração de Dívidas Técnicas (Pré-Sprint)

**Objetivo:** Eliminar os anti-patterns do Sprint 1 que se propagariam por todo o Sprint 2 se
não corrigidos agora. Não entrega feature visível ao usuário.

**Prioridade:** BLOQUEANTE — nenhuma outra task pode começar antes desta.

#### Arquivos a criar

| Arquivo | Conteúdo |
|---------|----------|
| `src/lib/errors.ts` | Classe `DataLayerError` com contexto |
| `supabase/config.toml` | Configuração do projeto Supabase CLI |
| `supabase/.gitignore` | Excluir `.branches`, `.temp` |

#### Arquivos a modificar

| Arquivo | O que muda |
|---------|-----------|
| `src/lib/auth.ts` | Adicionar `getAuthContext()` |
| `src/lib/leads.ts` | Refatorar `createLead` + `listCorretores`; trocar `throw error` por `throw new DataLayerError(...)` |
| `src/lib/properties.ts` | Refatorar `createProperty`; trocar `throw error` por `throw new DataLayerError(...)` |
| `src/types/domain.ts` | Popular com `AiScore`, `AiQualification`, `AiSummary`, `CorretorProfile` |
| `src/lib/database.types.ts` | Regenerar após rodar as migrations da Seção 4 |

#### Dependências

Nenhuma — é a primeira task.

#### Migrations necessárias

Todas as migrations da Seção 4 devem ser executadas **nesta task**, incluindo as migrations de IA e
histórico de status, para que o `database.types.ts` regenerado já contenha todos os novos tipos.

#### Especificação de `getAuthContext()`

```typescript
// src/lib/auth.ts — adicionar após getAuthClaims():
export async function getAuthContext(): Promise<AuthClaims> {
  const claims = await getAuthClaims()
  if (!claims?.companyId) throw new Error('Não autenticado')
  return claims
}
```

#### Especificação de `DataLayerError`

```typescript
// src/lib/errors.ts
export class DataLayerError extends Error {
  constructor(
    public readonly context: string,
    public readonly cause: unknown
  ) {
    super(`[${context}] ${cause instanceof Error ? cause.message : String(cause)}`)
    this.name = 'DataLayerError'
    if (cause instanceof Error) this.stack = cause.stack
  }
}
```

#### Especificação de `src/types/domain.ts`

```typescript
export type AiScore = 'quente' | 'morno' | 'frio'

export interface AiQualification {
  id: string
  leadId: string
  score: AiScore
  reasoning: string
  suggestedAction: string
  generatedAt: string
}

export interface AiSummary {
  id: string
  leadId: string
  content: string
  generatedAt: string
}

export interface CorretorProfile {
  id: string
  fullName: string
  email: string
  role: 'corretor' | 'gestor' | 'admin'
  active: boolean
}
```

#### Especificação da refatoração de `createLead`

```typescript
// ANTES (3 round-trips):
const { data: { user } } = await supabase.auth.getUser()
if (!user) throw new Error('Não autenticado')
const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user.id).single()
if (profileError || !profile?.company_id) throw new Error('Perfil não encontrado')
// insert com profile.company_id

// DEPOIS (1 round-trip):
import { getAuthContext } from './auth'
import { DataLayerError } from './errors'

export async function createLead(formData: LeadFormData): Promise<Lead> {
  const { userId, companyId } = await getAuthContext()
  const { data, error } = await supabase
    .from('leads')
    .insert({ ...formData, company_id: companyId })
    .select()
    .single()
  if (error) throw new DataLayerError('leads.create', error)
  return data
}
```

#### Especificação de `supabase/config.toml`

```toml
project_id = "uszopnkydweixqgyfynj"

[api]
enabled = true
port = 54321
schemas = ["public", "graphql_public"]

[auth]
enabled = true
site_url = "http://localhost:3000"
additional_redirect_urls = ["https://imobiia-frontend-v2.vercel.app"]
jwt_expiry = 3600
enable_refresh_token_rotation = true

[functions]
verify_jwt = true
```

#### Módulo norma-lib

Nenhum módulo novo gerado. Esta task completa `norma-auth` com `getAuthContext()`.

#### Critérios de aceite

- [ ] `src/lib/errors.ts` exporta `DataLayerError` com campo `context` acessível
- [ ] `getAuthContext()` em `auth.ts` lança erro se `companyId` for vazio
- [ ] `createLead` não contém mais `supabase.auth.getUser()` nem `profiles.select('company_id')`
- [ ] `createProperty` não contém mais `supabase.auth.getUser()` nem `profiles.select('company_id')`
- [ ] `listCorretores` reduzida de 3 para 1 query de banco
- [ ] `src/types/domain.ts` exporta `AiScore`, `AiQualification`, `AiSummary`, `CorretorProfile`
- [ ] `database.types.ts` contém as tabelas `ai_scores`, `ai_summaries`, `lead_status_history`
- [ ] `supabase/config.toml` criado e linkado ao projeto
- [ ] `tsc --noEmit` passa sem erros

#### Riscos e mitigações

| Risco | Probabilidade | Mitigação |
|-------|--------------|-----------|
| `getAuthClaims()` retornar `companyId` vazio em alguns edge cases | Baixa | `getAuthContext()` lança erro explícito; o guard em `_authenticated.tsx` garante que o JWT está válido antes de qualquer loader |
| Migrations quebrarem dados existentes | Baixa | As migrations apenas criam tabelas novas, não alteram as existentes |
| `database.types.ts` regenerado exigir ajuste de tipos existentes | Média | Rodar `tsc --noEmit` após regenerar; corrigir imports se necessário |

---

### Task 2.1.1 — Dashboard Analítico

**Objetivo:** Substituir o placeholder do dashboard por métricas reais do Supabase com gráfico
de pipeline, demonstrando analytics em tempo real sem backend customizado.

#### Arquivos a criar

| Arquivo | Conteúdo |
|---------|----------|
| `src/lib/analytics.ts` | Funções de agregação — chama RPC `get_dashboard_metrics` |
| `src/components/kpi-card.tsx` | Card de KPI genérico (label + value + trend opcional) |
| `src/components/leads-by-status-chart.tsx` | BarChart recharts de leads por status |

#### Arquivos a modificar

| Arquivo | O que muda |
|---------|-----------|
| `src/routes/_authenticated/dashboard.tsx` | Loader com `getDashboardMetrics()` + componentes de KPI e gráfico |
| `src/routes/_authenticated.tsx` | Adicionar "Corretores" ao `navItems` array |

#### Dependências

- Task 2.0.1 concluída (para `DataLayerError` e `getAuthContext()`)
- Migration `get_dashboard_metrics` RPC executada (Seção 4)
- `recharts` instalado: `npm install recharts`

#### Migrations necessárias

Migration `M-05: get_dashboard_metrics RPC` — ver Seção 4.

#### Especificação de `src/lib/analytics.ts`

```typescript
import { supabase } from './supabase'
import { DataLayerError } from './errors'

export interface LeadStatusCount {
  status: string
  count: number
}

export interface TopCorretor {
  id: string
  full_name: string
  leadCount: number
}

export interface DashboardMetrics {
  totalLeads: number
  leadsByStatus: LeadStatusCount[]
  topCorretores: TopCorretor[]
  activeProperties: number
}

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const { data, error } = await supabase.rpc('get_dashboard_metrics')
  if (error) throw new DataLayerError('analytics.getDashboardMetrics', error)
  return data as DashboardMetrics
}
```

#### Especificação do componente `kpi-card.tsx`

Props: `label: string`, `value: number | string`, `description?: string`, `trend?: 'up' | 'down' | 'neutral'`.
Estilo: card shadcn/ui com número grande em destaque. Sem dependências de dados externas.

#### Especificação do componente `leads-by-status-chart.tsx`

Props: `data: LeadStatusCount[]`.
Usa `BarChart` do `recharts` com `ResponsiveContainer width="100%" height={300}`.
Cores por status: `quente` → `#16a34a`, `morno` → `#d97706`, `frio` → `#6b7280`, demais → `#0E3A52`.
Não renderiza nada se `data` for array vazio.

#### Especificação da rota `dashboard.tsx`

```typescript
export const Route = createFileRoute('/_authenticated/dashboard')({
  loader: () => getDashboardMetrics(),
  pendingComponent: () => <DashboardSkeleton />,
  errorComponent: ({ error }) => <DashboardError message={...} />,
  component: DashboardPage,
})
```

Layout: grid 2 colunas em `sm`, 4 colunas em `lg` para os cards de KPI. Gráfico abaixo em largura total.
KPIs: "Total de Leads" (totalLeads), "Leads Ativos" (status ≠ fechado), "Imóveis Disponíveis" (activeProperties),
"Corretor Top" (topCorretores[0]?.full_name ?? '—').

#### Módulo norma-lib — `norma-dashboard`

Exportáveis como padrão reutilizável:
- `KpiCard` — componente genérico
- `DashboardMetrics` — interface de dados
- `getDashboardMetrics` — função abstrata (adaptável para outros CRMs)

#### Critérios de aceite

- [ ] Dashboard exibe 4 cards com valores numéricos reais (não mock)
- [ ] Gráfico de barras renderiza com dados reais de leads por status
- [ ] `pendingComponent` visível durante carregamento inicial
- [ ] `errorComponent` renderiza mensagem legível em caso de falha da RPC
- [ ] Layout responsivo: cards em 2 colunas em mobile, 4 em desktop
- [ ] `recharts` adicionado em `dependencies` no `package.json`
- [ ] "Corretores" aparece no sidebar como item de navegação
- [ ] `tsc --noEmit` passa

#### Riscos e mitigações

| Risco | Probabilidade | Mitigação |
|-------|--------------|-----------|
| RPC `get_dashboard_metrics` retornar NULL se não houver dados | Alta (demo vazio) | Função SQL usa `COALESCE('[]')` para arrays; JS usa `?? []` nas props |
| `recharts` incompatível com React 19 | Baixa | Verificar `peerDependencies` antes de instalar; alternativa: `@recharts/recharts@alpha` |
| Dados de `topCorretores` com join quebrando se perfil deletado | Baixa | RPC usa `LEFT JOIN` |

---

### Task 2.1.2 — Gestão de Corretores + Convite via Edge Function

**Objetivo:** Permitir que admins e gestores gerenciem o time de corretores da imobiliária,
incluindo convite por e-mail via Supabase Edge Function.

#### Arquivos a criar

| Arquivo | Conteúdo |
|---------|----------|
| `supabase/functions/invite-corretor/index.ts` | Edge Function Deno — convite via service role |
| `src/lib/corretores.ts` | CRUD de corretores (listar, desativar, convidar) |
| `src/routes/_authenticated/corretores.tsx` | Layout wrapper da seção |
| `src/routes/_authenticated/corretores.index.tsx` | Listagem de corretores |
| `src/routes/_authenticated/corretores.convidar.tsx` | Formulário de convite |

#### Arquivos a modificar

| Arquivo | O que muda |
|---------|-----------|
| `src/routes/_authenticated.tsx` | Confirmar "Corretores" no `navItems` (adicionado em 2.1.1) |

#### Dependências

- Task 2.0.1 concluída
- Task 2.1.1 concluída (para o item de nav já estar presente)
- `SUPABASE_SERVICE_ROLE_KEY` e `SITE_URL` configurados como secrets na Edge Function

#### Migrations necessárias

Nenhuma nova migration de tabela. Verificar que `profiles` tem coluna `active` (booleano);
se não existir, adicionar via migration `M-06` (Seção 4).

#### Especificação da Edge Function `invite-corretor`

```typescript
// supabase/functions/invite-corretor/index.ts
// Runtime: Deno, JWT verificado automaticamente pelo Supabase (verify_jwt = true em config.toml)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  // 1. Verificar que o caller é admin ou gestor
  const authHeader = req.headers.get('Authorization')
  const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader! } }
  })
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401 })
  const role = user.app_metadata?.role
  if (!['admin', 'gestor'].includes(role)) {
    return new Response(JSON.stringify({ error: 'Permissão insuficiente' }), { status: 403 })
  }
  const companyId = user.app_metadata?.company_id

  // 2. Validar body
  const { email, fullName } = await req.json()
  if (!email || !fullName) {
    return new Response(JSON.stringify({ error: 'email e fullName são obrigatórios' }), { status: 400 })
  }

  // 3. Convidar com service role key
  const adminClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const { data, error } = await adminClient.auth.admin.inviteUserByEmail(email, {
    data: {
      full_name: fullName,
      company_id: companyId,
      role: 'corretor',
    },
    redirectTo: `${Deno.env.get('SITE_URL')}/auth/login`,
  })
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 422 })

  return new Response(JSON.stringify({ userId: data.user?.id }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
```

**Arquivo compartilhado `supabase/functions/_shared/cors.ts`:**
```typescript
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
```

#### Especificação de `src/lib/corretores.ts`

```typescript
export async function listCorretoresPerfil(): Promise<CorretorProfile[]>
// Lê da tabela profiles filtrando por role = 'corretor' e company_id via RLS
// Retorna: id, full_name, email (via auth.users join ou campo email em profiles), role, active

export async function toggleCorretorStatus(corretorId: string, active: boolean): Promise<void>
// UPDATE profiles SET active = active WHERE id = corretorId
// Apenas admin ou gestor pode chamar; RLS deve garantir isolamento por empresa

export async function inviteCorretor(email: string, fullName: string): Promise<{ userId: string }>
// Chama supabase.functions.invoke('invite-corretor', { body: { email, fullName } })
// Lança DataLayerError se status HTTP não for 2xx
```

#### Especificação das rotas

**`corretores.index.tsx`:** Loader chama `listCorretoresPerfil()`. Tabela com colunas: Nome, Status (badge),
Ações (ativar/desativar). Botão "Convidar corretor" que navega para `/corretores/convidar`.
Somente admin e gestor veem o botão (verificar via `useAuth()` claims).

**`corretores.convidar.tsx`:** Formulário com campos Nome e E-mail. Submit chama `inviteCorretor()`.
Loading state no botão. Mensagem de sucesso: "Convite enviado para {email}". Em caso de erro,
exibir mensagem da API.

#### Fluxo pós-convite (infraestrutura Supabase)

Quando o corretor convidado clicar no link do e-mail e criar senha, o Supabase Auth dispara
o trigger `on_auth_user_created` que deve popular a tabela `profiles`. Verificar que este
trigger já existe no projeto (foi implementado no Sprint 1 para signup). Se não existir, adicionar
como migration.

#### Secrets necessários na Edge Function

```bash
# Executar localmente antes do deploy:
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<service_role_key_do_dashboard>
supabase secrets set SITE_URL=https://imobiia-frontend-v2.vercel.app
```

#### Módulo norma-lib — `norma-team-management`

Exportáveis como padrão reutilizável:
- Edge Function `invite-corretor` (configurável via env)
- `listCorretoresPerfil` / `toggleCorretorStatus` / `inviteCorretor`
- Rotas `corretores.index` e `corretores.convidar` (com nomes de campos genéricos)

#### Critérios de aceite

- [ ] Listagem de corretores exibe todos os corretores da empresa com status
- [ ] Admin consegue ativar/desativar corretor; a mudança persiste no banco
- [ ] Formulário de convite envia e-mail real ao corretor (verificar inbox)
- [ ] Corretor convidado aparece na listagem após aceitar o convite
- [ ] Usuário sem role admin/gestor não vê o botão de convite (UI) e recebe 403 da Edge Function
- [ ] Edge Function retorna erro legível se e-mail já cadastrado
- [ ] `tsc --noEmit` passa

#### Riscos e mitigações

| Risco | Probabilidade | Mitigação |
|-------|--------------|-----------|
| Tabela `profiles` não tem coluna `active` | Alta | Migration M-06 adiciona a coluna (Seção 4) |
| `profiles` não tem coluna `email` (email está só em `auth.users`) | Alta | `listCorretoresPerfil` faz join via RPC ou adiciona coluna `email` em `profiles` via trigger |
| Supabase CLI não instalado na máquina | Alta | Documentar setup: `npm install -g supabase` |
| Invite e-mail indo para spam em demo | Média | Configurar domínio de envio no Supabase Auth Settings |
| Trigger `on_auth_user_created` ausente | Média | Verificar e criar se necessário (Seção 4, migration M-07) |

> **Risco novo identificado:** A tabela `profiles` provavelmente não tem coluna `email` — o e-mail
> fica em `auth.users` que não é acessível via PostgREST. Para `listCorretoresPerfil` retornar o
> e-mail do corretor, é necessário uma de: (a) coluna `email` duplicada em `profiles` populada via
> trigger, ou (b) RPC com `SECURITY DEFINER` que faz join com `auth.users`. **Decisão necessária
> do PO:** exibir e-mail na listagem de corretores? Se sim, qual abordagem? Enquanto não decidido,
> implementar sem coluna email (só Nome e Status).

---

### Task 2.2.1 — Qualificação de Leads com IA

**Objetivo:** Criar a camada de serviço completa para qualificação automática de leads via
Claude API. A integração UI acontece na Task 2.3.1.

**O que esta task entrega:** Edge Function `qualify-lead`, `src/lib/ai.ts` com `qualifyLead()`,
tipos `AiQualification`, exibição do score na listagem de oportunidades.

**O que esta task NÃO entrega:** Botão "Qualificar com IA" (vai em 2.3.1), histórico de scores
na timeline (vai em 2.3.1).

#### Arquivos a criar

| Arquivo | Conteúdo |
|---------|----------|
| `supabase/functions/qualify-lead/index.ts` | Edge Function Deno — chama Claude API |
| `src/lib/ai.ts` | `qualifyLead()` e `summarizeLead()` (ambas aqui, separadas por seção) |
| `src/components/ai-score-badge.tsx` | Badge visual de score (quente/morno/frio) |

#### Arquivos a modificar

| Arquivo | O que muda |
|---------|-----------|
| `src/routes/_authenticated/oportunidades.index.tsx` | Adicionar coluna "Score IA" à tabela (exibe badge se existir) |
| `src/lib/leads.ts` | Adicionar `getLatestAiScore(leadId: string): Promise<AiQualification | null>` |

#### Dependências

- Task 2.0.1 concluída (para `DataLayerError`, `AiQualification`, `getAuthContext`)
- Migration M-01 (`ai_scores`) executada
- `ANTHROPIC_API_KEY` configurada como secret no Supabase

#### Migrations necessárias

Migration M-01 (`ai_scores`) — ver Seção 4. Já deve ter sido executada em 2.0.1.

#### Especificação da Edge Function `qualify-lead`

```typescript
// supabase/functions/qualify-lead/index.ts

// Recebe: { leadId: string }
// Retorna: AiQualification { score, reasoning, suggested_action, generated_at }
// Insere resultado em ai_scores usando o JWT do usuário (RLS aplicado)

// Modelo: claude-sonnet-4-6 (menor custo para qualificação)
// Max tokens: 300 (resposta estruturada curta)
// Temperatura: 0 (respostas consistentes)

// Prompt template:
const PROMPT = `Você é um especialista em qualificação de leads imobiliários.
Analise o lead abaixo e classifique como quente, morno ou frio.

Lead:
- Nome: {full_name}
- Orçamento: R$ {budget_min} – R$ {budget_max}
- Fonte: {source}
- Status atual: {status}
- Notas: {notes}

Responda APENAS com JSON válido neste formato:
{
  "score": "quente" | "morno" | "frio",
  "reasoning": "explicação em 1 frase",
  "suggested_action": "próxima ação recomendada em 1 frase"
}
`
```

#### Especificação de `getLatestAiScore`

```typescript
// src/lib/leads.ts — adicionar:
export async function getLatestAiScore(leadId: string): Promise<AiQualification | null> {
  const { data, error } = await supabase
    .from('ai_scores')
    .select('id, lead_id, score, reasoning, suggested_action, generated_at')
    .eq('lead_id', leadId)
    .order('generated_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw new DataLayerError('leads.getLatestAiScore', error)
  if (!data) return null
  return {
    id: data.id,
    leadId: data.lead_id,
    score: data.score as AiScore,
    reasoning: data.reasoning,
    suggestedAction: data.suggested_action,
    generatedAt: data.generated_at,
  }
}
```

#### Especificação de `ai-score-badge.tsx`

Props: `score: AiScore | null | undefined`.
- `null` / `undefined` → não renderiza nada
- `'quente'` → badge verde (`bg-green-100 text-green-800`) com texto "🔥 Quente"
- `'morno'` → badge amarelo (`bg-yellow-100 text-yellow-800`) com texto "🌡️ Morno"
- `'frio'` → badge cinza (`bg-gray-100 text-gray-700`) com texto "❄️ Frio"

#### Exibição do score na listagem de oportunidades

A rota `oportunidades.index.tsx` deve:
1. Carregar leads E seus scores mais recentes via `Promise.all`
2. Exibir `<AiScoreBadge score={score?.score} />` na linha da tabela
3. A coluna Score IA deve ser `hidden md:table-cell` (progressiva, só a partir de tablet)

```typescript
// loader atualizado:
loader: async () => {
  const leads = await listLeads()
  const scores = await Promise.all(leads.map(l => getLatestAiScore(l.id)))
  return { leads, scores }
}
```

#### Secrets necessários

```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
```

#### Módulo norma-lib — `norma-ai-qualifier`

Exportáveis:
- Edge Function `qualify-lead` (configurável por prompt)
- `qualifyLead()` em `ai.ts`
- `AiQualification` type
- `AiScoreBadge` component

#### Critérios de aceite

- [ ] Edge Function `qualify-lead` deployada (`supabase functions deploy qualify-lead`)
- [ ] `qualifyLead(leadId)` retorna `AiQualification` com os 3 campos obrigatórios
- [ ] Score é persistido em `ai_scores` com `lead_id` e `company_id` corretos
- [ ] Listagem de oportunidades exibe badge de score ao lado do nome
- [ ] Badge invisível (não quebra layout) para leads sem score
- [ ] Timeout da Edge Function: máximo 30 segundos (configurar em config.toml)
- [ ] Resposta não-JSON da Claude API gera `DataLayerError` legível
- [ ] `tsc --noEmit` passa

#### Riscos e mitigações

| Risco | Probabilidade | Mitigação |
|-------|--------------|-----------|
| Claude API retornar JSON inválido ou com campo `score` inesperado | Média | Validar resposta com guard: `if (!['quente','morno','frio'].includes(parsed.score)) throw` |
| Latência Claude API > 10s e timeout da Edge Function | Baixa | Usar `claude-haiku-4-5` para qualificação (mais rápido, menor custo) em vez de Sonnet |
| `ANTHROPIC_API_KEY` não configurada no ambiente de deploy | Média | A Edge Function deve retornar 500 com mensagem clara "API key não configurada" |
| N+1 queries na listagem (1 query de score por lead) | Alta | Substituir `Promise.all(leads.map(getLatestAiScore))` por query única: `SELECT DISTINCT ON (lead_id) ... ORDER BY lead_id, generated_at DESC` |

> **Risco novo identificado:** A abordagem de `Promise.all` com N queries para scores na listagem
> é um N+1 clássico. Para o demo (poucos leads), é aceitável. Para produção, é necessária uma
> query única que retorne o score mais recente de cada lead. Registrar como dívida técnica pós-Sprint 2.

---

### Task 2.2.2 — Resumo Inteligente de Oportunidade

**Objetivo:** Criar a camada de serviço para geração de resumo executivo de lead via Claude API.
A integração UI acontece na Task 2.3.1.

#### Arquivos a criar

| Arquivo | Conteúdo |
|---------|----------|
| `supabase/functions/summarize-lead/index.ts` | Edge Function Deno — chama Claude API |

#### Arquivos a modificar

| Arquivo | O que muda |
|---------|-----------|
| `src/lib/ai.ts` | Adicionar `summarizeLead()` e `getAiSummaries()` |

#### Dependências

- Task 2.0.1 concluída
- Task 2.2.1 concluída (compartilha `ai.ts`, `corsHeaders`, `ANTHROPIC_API_KEY` secret)
- Migration M-02 (`ai_summaries`) executada

#### Especificação da Edge Function `summarize-lead`

```typescript
// Recebe: { leadId: string }
// Retorna: AiSummary { content, generated_at }
// Insere em ai_summaries com o JWT do usuário

// Modelo: claude-sonnet-4-6 (resumos requerem mais qualidade)
// Max tokens: 500
// Temperatura: 0.3 (permite variação natural na escrita)

// Prompt template:
const PROMPT = `Você é um assistente de CRM imobiliário. Gere um resumo executivo
conciso desta oportunidade para o corretor.

Dados do lead:
- Nome: {full_name}
- E-mail: {email} | Telefone: {phone}
- Orçamento: R$ {budget_min} – R$ {budget_max}
- Fonte: {source}
- Status: {status}
- Corretor responsável: {corretor_name}
- Notas: {notes}
- Score IA atual: {latest_score}

Escreva um parágrafo de 3-5 frases em português do Brasil, tom profissional,
focando nos pontos mais relevantes para a próxima ação do corretor.`
```

#### Especificação das funções em `ai.ts`

```typescript
export async function summarizeLead(leadId: string): Promise<AiSummary>
// Chama supabase.functions.invoke('summarize-lead', { body: { leadId } })

export async function getAiSummaries(leadId: string): Promise<AiSummary[]>
// SELECT * FROM ai_summaries WHERE lead_id = leadId ORDER BY generated_at DESC
```

#### Módulo norma-lib — `norma-ai-summarizer`

Exportáveis:
- Edge Function `summarize-lead`
- `summarizeLead()` / `getAiSummaries()`
- `AiSummary` type

#### Critérios de aceite

- [ ] Edge Function `summarize-lead` deployada
- [ ] `summarizeLead(leadId)` retorna `AiSummary` com `content` em português do Brasil
- [ ] Resumo persistido em `ai_summaries` com histórico (múltiplos por lead são esperados)
- [ ] `getAiSummaries(leadId)` retorna lista ordenada por mais recente primeiro
- [ ] `tsc --noEmit` passa

#### Riscos e mitigações

| Risco | Probabilidade | Mitigação |
|-------|--------------|-----------|
| Resumo gerado em inglês se o prompt não for claro | Baixa | Prompt explícita "português do Brasil" |
| Edge Function precisar do nome do corretor mas só ter o UUID | Alta | A Edge Function busca `profiles.full_name` via `adminClient.from('profiles')` usando `assigned_to` UUID |

---

### Task 2.3.1 — Página de Detalhes de Oportunidade

**Objetivo:** Criar a rota `/oportunidades/:id` com todos os dados do lead, integração com
score IA, botão de qualificar, botão de gerar resumo e área de histórico de status.

Esta task integra tudo: ela é a "tela principal" do produto após o Sprint 2.

#### Arquivos a criar

| Arquivo | Conteúdo |
|---------|----------|
| `src/routes/_authenticated/oportunidades.$id.tsx` | Rota e componente de detalhes |
| `src/components/lead-detail-header.tsx` | Header com nome, score badge, ações |
| `src/components/ai-qualification-section.tsx` | Seção de score + botão "Qualificar com IA" |
| `src/components/ai-summary-section.tsx` | Seção de resumos + botão "Gerar resumo" |
| `src/components/status-timeline.tsx` | Timeline visual de histórico de status |

#### Arquivos a modificar

| Arquivo | O que muda |
|---------|-----------|
| `src/routes/_authenticated/oportunidades.index.tsx` | Link na coluna de nome aponta para `/oportunidades/$id` |
| `src/lib/leads.ts` | Adicionar `getLeadWithDetails(id)` com join de corretor |

#### Dependências

- Task 2.0.1 concluída
- Task 2.2.1 concluída (para `qualifyLead()`, `getLatestAiScore()`, `AiScoreBadge`)
- Task 2.2.2 concluída (para `summarizeLead()`, `getAiSummaries()`)
- Task 2.3.2 concluída (para `getStatusHistory()` na timeline) — pode ser desenvolvido em paralelo; a seção de timeline fica com dados vazios até 2.3.2 estar pronta

#### Especificação de `getLeadWithDetails`

```typescript
// src/lib/leads.ts — adicionar:
export interface LeadWithDetails extends Lead {
  corretor: { id: string; full_name: string } | null
}

export async function getLeadWithDetails(id: string): Promise<LeadWithDetails> {
  const { data, error } = await supabase
    .from('leads')
    .select('*, profiles!leads_assigned_to_fkey(id, full_name)')
    .eq('id', id)
    .single()
  if (error) throw new DataLayerError('leads.getWithDetails', error)
  return {
    ...data,
    corretor: data.profiles ?? null,
  }
}
```

#### Especificação do loader da rota

```typescript
loader: ({ params }) => Promise.all([
  getLeadWithDetails(params.id),
  getLatestAiScore(params.id),
  getAiSummaries(params.id),
  getStatusHistory(params.id),  // pode retornar [] até 2.3.2 estar pronta
])
```

#### Especificação do layout da página

```
[Header: Nome do lead | Badge Score IA | [Editar] [← Voltar]]

[Seção Info] ──────────────────────── [Seção IA]
  Status (badge)                        [Qualificar com IA]
  Fonte                                 Score: Quente ✓ (2h atrás)
  Corretor                              Justificativa: "..."
  Orçamento                             Próxima ação: "..."
  E-mail / Telefone
  Notas                                 [Gerar resumo]
                                        Resumo (texto gerado)
                                        [Ver resumos anteriores]

[Seção Timeline de Status]
  • 14/06 — Lead criado como Novo
  • 15/06 — Status: Novo → Contatado
  • 20/06 — Status: Contatado → Negociando
```

Layout em 2 colunas em `lg`, coluna única em mobile.

#### Estado de loading dos botões de IA

Botão "Qualificar com IA" e "Gerar resumo" devem ter estado `loading` individual
(`useState<boolean>` para cada botão). Após a chamada, atualizar o estado local da seção
sem recarregar a rota inteira (mutation pattern com `router.invalidate()` ou atualização via `useState`).

Recomendação: usar `useState` para `latestScore` e `summaries` na seção de IA, inicializando
com os valores do loader e atualizando após cada mutation.

#### Módulo norma-lib

Nenhum módulo novo. Esta task integra `norma-ai-qualifier` e `norma-ai-summarizer`.

#### Critérios de aceite

- [ ] Rota `/oportunidades/:id` existe e carrega dados reais do lead
- [ ] Nome do corretor exibido (não o UUID de `assigned_to`)
- [ ] Botão "Qualificar com IA" chama `qualifyLead(id)` e exibe resultado sem reload da página
- [ ] Botão tem estado de loading (desabilitado + texto "Qualificando...") durante a chamada
- [ ] Botão "Gerar resumo" chama `summarizeLead(id)` e adiciona o resumo à lista
- [ ] Lista de resumos anteriores exibe os mais recentes primeiro
- [ ] Timeline exibe eventos de mudança de status (pode estar vazia antes de 2.3.2)
- [ ] Link "← Oportunidades" leva de volta à listagem
- [ ] Link "Editar" leva para `/oportunidades/$id/editar` (existente do Sprint 1)
- [ ] Layout responsivo: 2 colunas em lg, 1 coluna em mobile
- [ ] `pendingComponent` e `errorComponent` presentes
- [ ] `tsc --noEmit` passa

#### Riscos e mitigações

| Risco | Probabilidade | Mitigação |
|-------|--------------|-----------|
| `profiles!leads_assigned_to_fkey` — nome da FK pode diferir do schema real | Alta | Verificar nome da FK no schema antes de implementar; alternativa: `Promise.all([getLeadById, getCorretorById])` |
| Estado da seção IA ficar desatualizado após mutation | Média | Usar `router.invalidate()` após cada mutation para recarregar o loader; ou gerenciar com `useState` local |

---

### Task 2.3.2 — Histórico de Status de Oportunidade

**Objetivo:** Ativar a timeline de histórico de status na página de detalhes, com dados reais
gerados pelo trigger de banco.

#### Arquivos a criar

| Arquivo | Conteúdo |
|---------|----------|
| — | Nenhum arquivo novo no frontend |

#### Arquivos a modificar

| Arquivo | O que muda |
|---------|-----------|
| `src/lib/leads.ts` | Adicionar `getStatusHistory(leadId: string): Promise<StatusHistoryEntry[]>` |
| `src/components/status-timeline.tsx` | Já criado em 2.3.1 — conectar a dados reais |
| `src/types/domain.ts` | Adicionar `StatusHistoryEntry` |

#### Dependências

- Task 2.3.1 concluída
- Migration M-03 (`lead_status_history` + trigger) executada (em 2.0.1)

#### Tipo `StatusHistoryEntry`

```typescript
// src/types/domain.ts — adicionar:
export interface StatusHistoryEntry {
  id: string
  leadId: string
  oldStatus: string | null
  newStatus: string
  changedAt: string
  changedBy?: { id: string; full_name: string } | null
}
```

#### Especificação de `getStatusHistory`

```typescript
export async function getStatusHistory(leadId: string): Promise<StatusHistoryEntry[]> {
  const { data, error } = await supabase
    .from('lead_status_history')
    .select('id, lead_id, old_status, new_status, changed_at, profiles!changed_by(id, full_name)')
    .eq('lead_id', leadId)
    .order('changed_at', { ascending: true })
  if (error) throw new DataLayerError('leads.getStatusHistory', error)
  return (data ?? []).map(row => ({
    id: row.id,
    leadId: row.lead_id,
    oldStatus: row.old_status,
    newStatus: row.new_status,
    changedAt: row.changed_at,
    changedBy: row.profiles ?? null,
  }))
}
```

#### Módulo norma-lib

Nenhum módulo novo.

#### Critérios de aceite

- [ ] Após salvar uma edição de oportunidade com mudança de status, a timeline exibe o novo evento
- [ ] O evento de criação (status inicial) também aparece na timeline
- [ ] Timeline ordenada do mais antigo ao mais recente
- [ ] Nome do corretor que fez a mudança é exibido quando disponível
- [ ] `tsc --noEmit` passa

#### Riscos e mitigações

| Risco | Probabilidade | Mitigação |
|-------|--------------|-----------|
| Trigger `record_lead_status_change` usando `auth.uid()` retornar NULL se chamado via Edge Function no futuro | Média | Campo `changed_by` é nullable — trigger continua funcionando, só omite o autor |
| Histórico vazio para leads criados antes do trigger existir | Alta (expected) | É comportamento esperado — a timeline só exibe eventos após a migration. Documentar isso na UI: "Histórico disponível a partir de [data]" |

---

## 3. Backlog Estruturado

### Épico E1 — Infraestrutura e Fundação

**Objetivo:** Eliminar dívidas técnicas e preparar a base para que todos os outros épicos
possam ser implementados corretamente.

**Feature F1.1 — Refatoração do data layer**
- Task 2.0.1 — Refatoração de dívidas técnicas (pré-Sprint)

**Feature F1.2 — Infraestrutura de Edge Functions**
- Parte de 2.0.1: criação do `supabase/config.toml` e `_shared/cors.ts`
- Parte de 2.1.2: deploy da primeira Edge Function

### Épico E2 — Analytics e Gestão de Time

**Objetivo:** Dar ao gestor visibilidade do pipeline e controle do time.

**Feature F2.1 — Dashboard analítico com dados reais**
- Task 2.1.1 — Dashboard analítico

**Feature F2.2 — Gestão de corretores**
- Task 2.1.2 — Gestão de corretores + convite via Edge Function

### Épico E3 — Inteligência Artificial no CRM

**Objetivo:** Demonstrar IA aplicada ao negócio imobiliário de forma tangível e mensurável.

**Feature F3.1 — Qualificação automática de leads**
- Task 2.2.1 — Qualificação de leads com IA (serviço)
- Task 2.3.1 — Página de detalhes (integração UI)

**Feature F3.2 — Resumo executivo por oportunidade**
- Task 2.2.2 — Resumo inteligente (serviço)
- Task 2.3.1 — Página de detalhes (integração UI)

### Épico E4 — Experiência e Detalhe de Oportunidade

**Objetivo:** Elevar a profundidade de informação disponível por lead.

**Feature F4.1 — Página de detalhes completa**
- Task 2.3.1 — Página de detalhes de oportunidade

**Feature F4.2 — Rastreabilidade de status**
- Task 2.3.2 — Histórico de status

### Resumo do backlog por prioridade

| Task | Épico | Prioridade | Bloqueada por | Bloqueia |
|------|-------|-----------|---------------|---------|
| 2.0.1 | E1 | P0 — CRÍTICA | — | Todas |
| 2.1.1 | E2 | P1 — Alta | 2.0.1 | — |
| 2.1.2 | E2 | P1 — Alta | 2.0.1 | — |
| 2.2.1 | E3 | P1 — Alta | 2.0.1 | 2.3.1 (UI) |
| 2.2.2 | E3 | P1 — Alta | 2.0.1, 2.2.1 | 2.3.1 (UI) |
| 2.3.1 | E4 | P1 — Alta | 2.0.1, 2.2.1, 2.2.2 | 2.3.2 |
| 2.3.2 | E4 | P2 — Média | 2.3.1 | — |

---

## 4. Migrations SQL Completas

Executar no Supabase SQL Editor **antes** de iniciar qualquer task de desenvolvimento.
A ordem importa: M-01 a M-08 devem ser executadas em sequência.

---

### M-01 — Tabela `ai_scores`

```sql
-- M-01: Tabela de scores de qualificação IA
CREATE TABLE IF NOT EXISTS public.ai_scores (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id        UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  company_id     UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  score          TEXT NOT NULL CHECK (score IN ('quente', 'morno', 'frio')),
  reasoning      TEXT NOT NULL,
  suggested_action TEXT NOT NULL,
  generated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE public.ai_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company_isolation_ai_scores_select"
  ON public.ai_scores FOR SELECT
  USING (company_id = ((auth.jwt() -> 'app_metadata') ->> 'company_id')::UUID);

CREATE POLICY "company_isolation_ai_scores_insert"
  ON public.ai_scores FOR INSERT
  WITH CHECK (company_id = ((auth.jwt() -> 'app_metadata') ->> 'company_id')::UUID);

-- Índices
CREATE INDEX ai_scores_lead_id_idx        ON public.ai_scores(lead_id);
CREATE INDEX ai_scores_company_id_idx     ON public.ai_scores(company_id);
CREATE INDEX ai_scores_generated_at_idx   ON public.ai_scores(generated_at DESC);

-- Para buscar o score mais recente de cada lead em uma query:
CREATE UNIQUE INDEX ai_scores_latest_per_lead_idx
  ON public.ai_scores(lead_id, generated_at DESC);

-- Grant
GRANT SELECT, INSERT ON public.ai_scores TO authenticated;
```

---

### M-02 — Tabela `ai_summaries`

```sql
-- M-02: Tabela de resumos inteligentes IA
CREATE TABLE IF NOT EXISTS public.ai_summaries (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id      UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  company_id   UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  content      TEXT NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE public.ai_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company_isolation_ai_summaries_select"
  ON public.ai_summaries FOR SELECT
  USING (company_id = ((auth.jwt() -> 'app_metadata') ->> 'company_id')::UUID);

CREATE POLICY "company_isolation_ai_summaries_insert"
  ON public.ai_summaries FOR INSERT
  WITH CHECK (company_id = ((auth.jwt() -> 'app_metadata') ->> 'company_id')::UUID);

-- Índices
CREATE INDEX ai_summaries_lead_id_idx      ON public.ai_summaries(lead_id);
CREATE INDEX ai_summaries_company_id_idx   ON public.ai_summaries(company_id);
CREATE INDEX ai_summaries_generated_at_idx ON public.ai_summaries(generated_at DESC);

-- Grant
GRANT SELECT, INSERT ON public.ai_summaries TO authenticated;
```

---

### M-03 — Tabela `lead_status_history` + Trigger

```sql
-- M-03: Histórico de mudanças de status de leads

CREATE TABLE IF NOT EXISTS public.lead_status_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id     UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  company_id  UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  old_status  TEXT,
  new_status  TEXT NOT NULL,
  changed_by  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  changed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE public.lead_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company_isolation_status_history_select"
  ON public.lead_status_history FOR SELECT
  USING (company_id = ((auth.jwt() -> 'app_metadata') ->> 'company_id')::UUID);

-- Índices
CREATE INDEX lead_status_history_lead_id_idx   ON public.lead_status_history(lead_id);
CREATE INDEX lead_status_history_changed_at_idx ON public.lead_status_history(changed_at ASC);

-- Grant
GRANT SELECT ON public.lead_status_history TO authenticated;

-- Trigger function
CREATE OR REPLACE FUNCTION public.record_lead_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.lead_status_history (lead_id, company_id, old_status, new_status, changed_by)
    VALUES (NEW.id, NEW.company_id, OLD.status::TEXT, NEW.status::TEXT, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger (dispara após UPDATE em leads)
DROP TRIGGER IF EXISTS lead_status_change_trigger ON public.leads;
CREATE TRIGGER lead_status_change_trigger
  AFTER UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.record_lead_status_change();

-- Registrar o status inicial ao criar um lead
CREATE OR REPLACE FUNCTION public.record_initial_lead_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.lead_status_history (lead_id, company_id, old_status, new_status, changed_by)
  VALUES (NEW.id, NEW.company_id, NULL, NEW.status::TEXT, auth.uid());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS lead_initial_status_trigger ON public.leads;
CREATE TRIGGER lead_initial_status_trigger
  AFTER INSERT ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.record_initial_lead_status();
```

---

### M-04 — Triggers de `updated_at` (resolve AMD Seção 3.2)

```sql
-- M-04: Triggers de updated_at para leads e properties
-- Elimina a necessidade de setar updated_at manualmente no código

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Para leads
DROP TRIGGER IF EXISTS leads_set_updated_at ON public.leads;
CREATE TRIGGER leads_set_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Para properties
DROP TRIGGER IF EXISTS properties_set_updated_at ON public.properties;
CREATE TRIGGER properties_set_updated_at
  BEFORE UPDATE ON public.properties
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();
```

Após criar esta migration, remover `updated_at: new Date().toISOString()` de `updateLead`
e `updateProperty` em `leads.ts` e `properties.ts`.

---

### M-05 — RPC `get_dashboard_metrics`

```sql
-- M-05: Função RPC para métricas do dashboard
-- SECURITY INVOKER: RLS aplicado com base no JWT do caller
-- Não recebe parâmetros — o isolamento por empresa é feito pelo RLS

CREATE OR REPLACE FUNCTION public.get_dashboard_metrics()
RETURNS JSON
LANGUAGE plpgsql
SECURITY INVOKER
STABLE
AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'totalLeads',
    (SELECT COUNT(*) FROM public.leads),

    'leadsByStatus',
    COALESCE(
      (SELECT json_agg(json_build_object('status', status::TEXT, 'count', cnt))
       FROM (SELECT status, COUNT(*) AS cnt FROM public.leads GROUP BY status ORDER BY cnt DESC) s),
      '[]'::JSON
    ),

    'topCorretores',
    COALESCE(
      (SELECT json_agg(json_build_object('id', sub.assigned_to, 'full_name', p.full_name, 'leadCount', sub.cnt))
       FROM (
         SELECT l.assigned_to, COUNT(*) AS cnt
         FROM public.leads l
         WHERE l.assigned_to IS NOT NULL
         GROUP BY l.assigned_to
         ORDER BY cnt DESC
         LIMIT 5
       ) sub
       LEFT JOIN public.profiles p ON p.id = sub.assigned_to),
      '[]'::JSON
    ),

    'activeProperties',
    (SELECT COUNT(*) FROM public.properties WHERE status = 'disponivel')

  ) INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_dashboard_metrics() TO authenticated;
```

---

### M-06 — Coluna `active` em `profiles`

```sql
-- M-06: Adicionar coluna active na tabela profiles para gestão de corretores
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE;

-- Atualizar política RLS existente em leads para filtrar por corretores ativos
-- (opcional — depende de decisão do PO se leads de corretores desativados devem aparecer)
```

---

### M-07 — Verificar trigger `on_auth_user_created`

```sql
-- M-07: Garantir que o trigger de criação de profile existe
-- Este trigger popula a tabela profiles quando um novo usuário é criado no Supabase Auth
-- (deve ter sido criado no Sprint 1; esta migration verifica e recria se necessário)

-- Verificar existência:
SELECT trigger_name FROM information_schema.triggers
WHERE event_object_schema = 'auth' AND event_object_table = 'users'
  AND trigger_name = 'on_auth_user_created';

-- Se não existir, criar:
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, company_id, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    (NEW.raw_user_meta_data ->> 'company_id')::UUID,
    COALESCE(NEW.raw_user_meta_data ->> 'role', 'corretor')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

---

### M-08 — Regenerar `database.types.ts`

Após executar M-01 a M-07, regenerar os tipos TypeScript:

```bash
# Na raiz do projeto:
npx supabase gen types typescript --project-id uszopnkydweixqgyfynj > src/lib/database.types.ts
```

Isso tornará as tabelas `ai_scores`, `ai_summaries` e `lead_status_history` disponíveis
como `Database['public']['Tables']['ai_scores']['Row']` etc.

---

## 5. Plano de Execução para o Claude Code

Cada prompt abaixo é o exato texto a ser enviado ao Claude Code para implementar a task.
Usar em sessões separadas do Cowork para controle de contexto.

---

### Prompt 2.0.1 — Refatoração de Dívidas Técnicas

```
TASK 2.0.1 — IMOBIIA | Refatoração de Dívidas Técnicas

## Contexto
Projeto IMOBIIA (React 19 + TanStack Router + Supabase + TypeScript 6 + Tailwind v4).
Diretório: imobiia-frontend-v2/

## Leia antes de começar (obrigatório)
1. src/lib/auth.ts — entender getAuthClaims() e o padrão de logError
2. src/lib/leads.ts — identificar os 3 round-trips em createLead e listCorretores
3. src/lib/properties.ts — identificar os 3 round-trips em createProperty
4. src/types/domain.ts — está vazio, vai receber os novos tipos
5. SPRINT2_PRD.md Seção 2 Task 2.0.1 — especificação completa

## O que implementar

### 1. Criar src/lib/errors.ts
Exportar classe DataLayerError com campos: context (string), cause (unknown).
Mensagem: `[${context}] ${cause.message}`.

### 2. Adicionar getAuthContext() em src/lib/auth.ts
Chama getAuthClaims(). Se companyId for vazio ou undefined, lança Error('Não autenticado').
Retorna AuthClaims.

### 3. Refatorar src/lib/leads.ts
- createLead: substituir auth.getUser() + profiles.select() por const { companyId } = await getAuthContext()
- listCorretores: substituir auth.getUser() + profiles.select('company_id') por getAuthContext().companyId
- Todas as ocorrências de "throw error" passam a ser "throw new DataLayerError('<contexto>', error)"
  Contextos: 'leads.listCorretores', 'leads.list', 'leads.getById', 'leads.create', 'leads.update'

### 4. Refatorar src/lib/properties.ts
- createProperty: mesma refatoração de round-trips
- Trocar throw error por DataLayerError
  Contextos: 'properties.list', 'properties.getById', 'properties.create', 'properties.update'

### 5. Popular src/types/domain.ts
Adicionar: AiScore, AiQualification, AiSummary, CorretorProfile (ver SPRINT2_PRD.md).

### 6. Criar supabase/config.toml e supabase/.gitignore
Ver SPRINT2_PRD.md para conteúdo exato.

### 7. Criar supabase/functions/_shared/cors.ts
Exportar corsHeaders com os 3 headers CORS padrão.

## Padrões obrigatórios
- NUNCA usar supabase.auth.getUser() em data layer — usar getAuthContext()
- NUNCA usar throw error diretamente — usar new DataLayerError(contexto, error)
- Manter todos os tipos derivados de Database['public']['Tables']

## Critérios de aceite que você deve verificar
1. Executar: grep -n "auth.getUser" src/lib/leads.ts src/lib/properties.ts
   → deve retornar 0 resultados
2. Executar: grep -n "profiles.*select.*company_id" src/lib/leads.ts src/lib/properties.ts
   → deve retornar 0 resultados
3. Executar: npx tsc --noEmit
   → deve passar sem erros
4. Confirmar que DataLayerError está sendo importado e usado em leads.ts e properties.ts
```

---

### Prompt 2.1.1 — Dashboard Analítico

```
TASK 2.1.1 — IMOBIIA | Dashboard Analítico

## Contexto
Task 2.0.1 foi concluída. Migrations M-01 a M-08 executadas no Supabase.
Diretório: imobiia-frontend-v2/

## Leia antes de começar (obrigatório)
1. src/routes/_authenticated/dashboard.tsx — estado atual (placeholder)
2. src/routes/_authenticated.tsx — navItems array (adicionar Corretores)
3. src/lib/errors.ts — DataLayerError (criado em 2.0.1)
4. SPRINT2_PRD.md Seção 2 Task 2.1.1 — especificação completa
5. package.json — verificar se recharts está instalado; se não, instalar

## O que implementar

### 1. Instalar recharts
npm install recharts @types/recharts --save
(se @types/recharts não existir, recharts já inclui types — apenas: npm install recharts)

### 2. Criar src/lib/analytics.ts
Exportar DashboardMetrics, LeadStatusCount, TopCorretor (interfaces).
Exportar getDashboardMetrics() que chama supabase.rpc('get_dashboard_metrics').
Em caso de erro: throw new DataLayerError('analytics.getDashboardMetrics', error).

### 3. Criar src/components/kpi-card.tsx
Props: label, value, description? (opcional).
Estilo: Card shadcn (import de src/components/ui/card.tsx).
Value em font-bold text-3xl. Label em text-sm text-gray-500.

### 4. Criar src/components/leads-by-status-chart.tsx
Props: data (LeadStatusCount[]).
Usar ResponsiveContainer + BarChart + Bar do recharts.
height={300}. Cores: verde para 'quente', amarelo para 'morno', cinza para demais.
Se data.length === 0, exibir <p className="text-gray-400">Sem dados</p>.

### 5. Reescrever src/routes/_authenticated/dashboard.tsx
Loader: () => getDashboardMetrics()
pendingComponent: skeleton de 4 cards (divs com bg-gray-100 animate-pulse)
errorComponent: mensagem de erro legível
Componente: grid de 4 KpiCards + gráfico em largura total abaixo.

### 6. Adicionar "Corretores" ao navItems em _authenticated.tsx
{ label: 'Corretores', to: '/corretores' }
Inserir após 'Oportunidades', antes do botão Sair.

## Padrões obrigatórios
- Loader obrigatório (não useEffect para buscar dados)
- pendingComponent e errorComponent em toda rota com loader
- Componentes recebem dados via props — nunca buscam dados internamente

## Critérios de aceite que você deve verificar
1. Acessar /dashboard no browser — deve exibir 4 cards com números
2. Gráfico deve renderizar barras coloridas
3. npx tsc --noEmit → sem erros
4. "Corretores" aparece no sidebar
5. Verificar que getDashboardMetrics está em analytics.ts (não em leads.ts)
```

---

### Prompt 2.1.2 — Gestão de Corretores

```
TASK 2.1.2 — IMOBIIA | Gestão de Corretores + Convite via Edge Function

## Contexto
Tasks 2.0.1 e 2.1.1 concluídas. supabase/config.toml existe.
Diretório: imobiia-frontend-v2/

## Leia antes de começar (obrigatório)
1. src/lib/leads.ts — padrão de listCorretores() como referência
2. src/lib/errors.ts — DataLayerError
3. src/lib/auth.ts — getAuthContext()
4. supabase/functions/_shared/cors.ts — corsHeaders (criado em 2.0.1)
5. SPRINT2_PRD.md Seção 2 Task 2.1.2 — especificação COMPLETA da Edge Function

## O que implementar

### 1. Criar supabase/functions/invite-corretor/index.ts
Ver SPRINT2_PRD.md para o código exato da Edge Function.
NÃO usar service role key hardcoded — usar Deno.env.get('SUPABASE_SERVICE_ROLE_KEY').
Verificar role do caller antes de prosseguir (apenas 'admin' ou 'gestor').

### 2. Criar src/lib/corretores.ts
- listCorretoresPerfil(): busca profiles WHERE role = 'corretor', retorna campos id, full_name, role, active
  OBS: NÃO incluir campo email nesta versão (ver SPRINT2_PRD.md Risco ativo da Task 2.1.2)
- toggleCorretorStatus(corretorId, active): UPDATE profiles SET active = ? WHERE id = ?
- inviteCorretor(email, fullName): chama supabase.functions.invoke('invite-corretor', { body: { email, fullName } })
  Verificar resposta: se data.error, throw new DataLayerError('corretores.invite', data.error)

### 3. Criar src/routes/_authenticated/corretores.tsx
Layout wrapper simples com <Outlet />, sem lógica adicional.

### 4. Criar src/routes/_authenticated/corretores.index.tsx
Loader: listCorretoresPerfil()
Tabela com colunas: Nome | Status (badge Ativo/Inativo) | Ações (botão toggle)
Botão "Convidar corretor" visível apenas para role 'admin' ou 'gestor' (usar useAuth())
Botão leva para /corretores/convidar

### 5. Criar src/routes/_authenticated/corretores.convidar.tsx
Formulário com inputs: fullName (obrigatório) e email (obrigatório, type="email")
Submit: await inviteCorretor(email, fullName)
Sucesso: exibir "Convite enviado para {email}" e resetar form
Erro: exibir mensagem de erro da API

## Deploy da Edge Function (instruir o usuário)
Ao final, exibir no terminal:
> Para deployar a Edge Function, execute:
> npx supabase functions deploy invite-corretor --project-ref uszopnkydweixqgyfynj
> npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<sua_service_role_key> --project-ref uszopnkydweixqgyfynj
> npx supabase secrets set SITE_URL=https://imobiia-frontend-v2.vercel.app --project-ref uszopnkydweixqgyfynj

## Critérios de aceite que você deve verificar
1. Rota /corretores carrega sem erros (mesmo que lista vazia)
2. npx tsc --noEmit → sem erros
3. inviteCorretor em corretores.ts usa supabase.functions.invoke (nunca supabase.auth.admin)
4. Edge Function não tem nenhum secret hardcoded
```

---

### Prompt 2.2.1 — Qualificação de Leads com IA

```
TASK 2.2.1 — IMOBIIA | Qualificação de Leads com IA

## Contexto
Task 2.0.1 concluída. Tabela ai_scores existe no Supabase.
ANTHROPIC_API_KEY precisa ser configurada como secret.
Diretório: imobiia-frontend-v2/

## Leia antes de começar (obrigatório)
1. src/lib/leads.ts — getLeadById() como referência para buscar dados do lead
2. src/types/domain.ts — AiScore, AiQualification (criados em 2.0.1)
3. src/lib/errors.ts — DataLayerError
4. supabase/functions/_shared/cors.ts — corsHeaders
5. SPRINT2_PRD.md Seção 2 Task 2.2.1 — especificação completa do prompt e da Edge Function

## O que implementar

### 1. Criar supabase/functions/qualify-lead/index.ts
Recebe: { leadId: string } no body.
1. Verificar JWT do caller (userClient.auth.getUser())
2. Buscar lead: userClient.from('leads').select('*').eq('id', leadId).single()
3. Montar prompt com dados do lead (ver SPRINT2_PRD.md para template exato)
4. Chamar Claude API via fetch:
   POST https://api.anthropic.com/v1/messages
   Headers: { 'x-api-key': Deno.env.get('ANTHROPIC_API_KEY'), 'anthropic-version': '2023-06-01' }
   Body: { model: 'claude-haiku-4-5-20251001', max_tokens: 300, messages: [{ role: 'user', content: prompt }] }
5. Parsear resposta: JSON.parse(response.content[0].text)
6. Validar que score IN ('quente', 'morno', 'frio')
7. Inserir em ai_scores usando userClient (RLS aplicado):
   userClient.from('ai_scores').insert({ lead_id, company_id, score, reasoning, suggested_action })
8. Retornar { score, reasoning, suggested_action, generated_at }

### 2. Criar src/lib/ai.ts
Exportar qualifyLead(leadId: string): Promise<AiQualification>
Chama supabase.functions.invoke('qualify-lead', { body: { leadId } })
Retorna AiQualification mapeado dos campos snake_case para camelCase.

### 3. Adicionar getLatestAiScore(leadId) em src/lib/leads.ts
Query: ai_scores WHERE lead_id = ? ORDER BY generated_at DESC LIMIT 1 (maybeSingle)
Retorna AiQualification | null.

### 4. Criar src/components/ai-score-badge.tsx
Props: score: AiScore | null | undefined
Ver SPRINT2_PRD.md para cores e textos exatos.
Se null/undefined: return null (não renderizar nada).

### 5. Atualizar src/routes/_authenticated/oportunidades.index.tsx
Loader: Promise.all([listLeads(), ...]) — adicionar scores
Ver SPRINT2_PRD.md para abordagem de carregar scores.
Adicionar coluna "Score IA" na tabela: hidden md:table-cell com AiScoreBadge.

## Deploy
Ao final, exibir:
> npx supabase functions deploy qualify-lead --project-ref uszopnkydweixqgyfynj
> npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-... --project-ref uszopnkydweixqgyfynj

## Critérios de aceite que você deve verificar
1. npx tsc --noEmit → sem erros
2. ai.ts não contém string 'sk-ant' (API key não hardcoded)
3. qualify-lead/index.ts valida score antes de inserir em ai_scores
4. AiScoreBadge retorna null quando score é undefined (não quebra a listagem)
5. Listagem de oportunidades renderiza sem erros mesmo com scores vazios
```

---

### Prompt 2.2.2 — Resumo Inteligente

```
TASK 2.2.2 — IMOBIIA | Resumo Inteligente de Oportunidade

## Contexto
Task 2.2.1 concluída. Tabela ai_summaries existe. ANTHROPIC_API_KEY configurada.
Diretório: imobiia-frontend-v2/

## Leia antes de começar (obrigatório)
1. supabase/functions/qualify-lead/index.ts — padrão de Edge Function a replicar
2. src/lib/ai.ts — adicionar funções aqui
3. src/types/domain.ts — AiSummary (criado em 2.0.1)
4. SPRINT2_PRD.md Seção 2 Task 2.2.2 — template de prompt e especificação

## O que implementar

### 1. Criar supabase/functions/summarize-lead/index.ts
Mesma estrutura de qualify-lead, com diferenças:
- Usa claude-sonnet-4-6 (melhor qualidade para texto)
- max_tokens: 500
- Busca também o nome do corretor (profiles join) para incluir no prompt
- Não valida JSON (retorna texto livre)
- Insere em ai_summaries (não ai_scores)
- Ver SPRINT2_PRD.md para prompt template exato

### 2. Adicionar em src/lib/ai.ts:
- summarizeLead(leadId: string): Promise<AiSummary>
- getAiSummaries(leadId: string): Promise<AiSummary[]>
  Query: ai_summaries WHERE lead_id = ? ORDER BY generated_at DESC

## Deploy
> npx supabase functions deploy summarize-lead --project-ref uszopnkydweixqgyfynj

## Critérios de aceite
1. npx tsc --noEmit → sem erros
2. summarizeLead retorna AiSummary com content em string (nunca null/undefined)
3. getAiSummaries retorna array vazio (não null) quando não há resumos
```

---

### Prompt 2.3.1 — Página de Detalhes de Oportunidade

```
TASK 2.3.1 — IMOBIIA | Página de Detalhes de Oportunidade

## Contexto
Tasks 2.0.1, 2.2.1 e 2.2.2 concluídas. Esta task integra tudo na UI.
Diretório: imobiia-frontend-v2/

## Leia antes de começar (obrigatório)
1. src/routes/_authenticated/oportunidades.$id.editar.tsx — padrão de rota com parâmetro $id
2. src/lib/leads.ts — getLeadById, getLatestAiScore
3. src/lib/ai.ts — qualifyLead, summarizeLead, getAiSummaries
4. src/components/ai-score-badge.tsx — já criado em 2.2.1
5. src/types/domain.ts — AiQualification, AiSummary, StatusHistoryEntry
6. SPRINT2_PRD.md Seção 2 Task 2.3.1 — layout completo e spec dos componentes

## O que implementar

### 1. Adicionar getLeadWithDetails(id) em src/lib/leads.ts
Ver SPRINT2_PRD.md para especificação exata do select com join de profiles.
Atenção: verificar o nome exato da FK de assigned_to no schema antes de escrever a query.
Se o nome da FK não for óbvio, usar Promise.all([getLeadById(id), getCorretorById(assigned_to)]).

### 2. Criar src/routes/_authenticated/oportunidades.$id.tsx
Loader: Promise.all([getLeadWithDetails(id), getLatestAiScore(id), getAiSummaries(id), getStatusHistory(id)])
Note: getStatusHistory pode retornar [] — isso é esperado até 2.3.2 estar pronta.
pendingComponent: skeleton do layout de 2 colunas.
errorComponent: mensagem com link para voltar à listagem.

### 3. Criar src/components/lead-detail-header.tsx
Props: lead (LeadWithDetails), score (AiQualification | null).
Exibe: nome, AiScoreBadge, botão "← Oportunidades" e botão "Editar".

### 4. Criar src/components/ai-qualification-section.tsx
Props: leadId (string), initialScore (AiQualification | null).
Estado local: score (useState inicializado com initialScore), loading (useState false).
Botão "Qualificar com IA": onClick chama qualifyLead(leadId), atualiza score no state.
Durante loading: botão desabilitado com texto "Qualificando...".
Exibe: AiScoreBadge, reasoning, suggestedAction do score atual.

### 5. Criar src/components/ai-summary-section.tsx
Props: leadId (string), initialSummaries (AiSummary[]).
Estado local: summaries (useState), loading (useState).
Botão "Gerar resumo": chama summarizeLead(leadId), adiciona resultado no início do array de summaries.
Exibe: o resumo mais recente em destaque, lista dos demais com data.

### 6. Criar src/components/status-timeline.tsx
Props: entries (StatusHistoryEntry[]).
Se entries.length === 0: exibir "Nenhuma mudança de status registrada ainda."
Renderizar uma linha por entry: ícone de círculo, data formatada, de "Status A" → "Status B".

### 7. Atualizar oportunidades.index.tsx
Link na coluna de nome do lead: passar de texto para <Link to="/oportunidades/$id" params={{ id: lead.id }}>

## Layout de 2 colunas (IMPORTANTE)
- Mobile: 1 coluna, info primeiro, IA segundo
- lg+: 2 colunas, col-span-1 para info, col-span-1 para IA
- Timeline: largura total abaixo das 2 colunas

## Critérios de aceite que você deve verificar
1. /oportunidades/:id carrega com dados reais do lead
2. Botão "Qualificar com IA" atualiza o badge SEM recarregar a página
3. Botão "Gerar resumo" adiciona o novo resumo na lista SEM recarregar
4. Botão "Editar" leva para /oportunidades/$id/editar
5. Link "← Oportunidades" leva para /oportunidades
6. npx tsc --noEmit → sem erros
7. Em mobile (375px): layout de 1 coluna, sem overflow horizontal
```

---

### Prompt 2.3.2 — Histórico de Status

```
TASK 2.3.2 — IMOBIIA | Histórico de Status de Oportunidade

## Contexto
Task 2.3.1 concluída. Trigger de banco (M-03) já existe desde a task 2.0.1.
Diretório: imobiia-frontend-v2/

## Leia antes de começar (obrigatório)
1. src/components/status-timeline.tsx — já criado em 2.3.1 com StatusHistoryEntry
2. src/types/domain.ts — StatusHistoryEntry
3. src/routes/_authenticated/oportunidades.$id.tsx — loader atual com getStatusHistory
4. SPRINT2_PRD.md Seção 2 Task 2.3.2 — especificação de getStatusHistory

## O que implementar

### 1. Adicionar getStatusHistory(leadId) em src/lib/leads.ts
Ver SPRINT2_PRD.md para especificação e select com join de profiles.
Retorna StatusHistoryEntry[] ordenado por changed_at ASC (mais antigo primeiro).

### 2. O componente status-timeline.tsx já existe
Apenas garantir que está conectado a dados reais no loader da rota $id.tsx.
O loader já passa getStatusHistory(params.id) — verificar se o componente renderiza os entries.

## Critérios de aceite que você deve verificar
1. Editar uma oportunidade mudando o status → navegar para os detalhes → timeline mostra o evento
2. getStatusHistory retorna array (nunca null) quando não há histórico
3. npx tsc --noEmit → sem erros
4. O evento de criação do lead (old_status: null, new_status: 'novo') aparece como primeiro item
```

---

## 6. Checkpoints de Revisão

### Quando pausar para Tech Review do Cowork

| Após concluir | Tech Review |
|--------------|-------------|
| Task 2.0.1 | Verificar: ausência de `auth.getUser()` no data layer, `DataLayerError` em uso, `tsc` limpo |
| Task 2.1.1 | Verificar: dashboard carrega dados reais, recharts renderiza, KPIs corretos |
| Task 2.1.2 | Verificar: Edge Function deployada, CRUD de corretores funcional, convite enviado |
| Task 2.2.1 | Verificar: Edge Function, score persiste em `ai_scores`, badge na listagem |
| Task 2.3.1 | Verificar: detalhes completos, botões IA funcionam, layout responsivo |
| Task 2.3.2 | Verificar: timeline com dados reais após mudança de status |

### Quando solicitar aprovação do Product Owner

| Momento | O que mostrar |
|---------|--------------|
| Após 2.1.1 | Demo do dashboard com dados reais — validar que os KPIs fazem sentido |
| Após 2.1.2 | Fluxo de convite ao vivo — convidar um e-mail de teste e aceitar |
| Após 2.3.1 completo | Demo da página de detalhes com IA — mostrar qualificação e resumo ao vivo |
| Fim do Sprint 2 | Review completo — todas as features, mobile, edge cases |

### Quando o AMD deve ser atualizado

| Trigger | Seção do AMD a atualizar |
|---------|-------------------------|
| Task 2.0.1 concluída | Seção 3.1 e 3.2 (dívidas resolvidas) |
| Task 2.1.2 concluída | Seção 5.7 (norma-team-management — status: pronto) |
| Task 2.2.1 concluída | Seção 5.3 (norma-ai-qualifier — status: pronto) |
| Task 2.2.2 concluída | Seção 5.4 (norma-ai-summarizer — status: pronto) |
| Decisão sobre coluna email em profiles | Seção 8 (risco ativo Task 2.1.2 — marcar como resolvido) |

### Riscos novos identificados nesta fase

| Risco | Impacto | Task afetada | Ação requerida do PO |
|-------|---------|-------------|---------------------|
| `profiles` não tem coluna `email` — listagem de corretores sem e-mail | Baixo | 2.1.2 | Decidir se o e-mail deve aparecer na listagem e qual abordagem (M-06 + trigger ou RPC) |
| N+1 queries em scores na listagem de oportunidades | Médio (demo OK, prod não) | 2.2.1 | Registrar como dívida técnica Sprint 3 — não bloqueia Sprint 2 |
| Trigger `on_auth_user_created` pode não existir ainda | Alto | 2.1.2 | Verificar via M-07 antes de iniciar 2.1.2 |

---

*IMOBIIA — PRD + Backlog Sprint 2 v1.0 — Norma IA — 2026-06-28*  
*Documento produzido com base no Architecture Master Document v1.0 e nas Decisões do PO aprovadas.*
