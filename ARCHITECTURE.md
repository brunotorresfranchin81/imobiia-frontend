# IMOBIIA — Architecture Master Document
**Versão:** 1.0  
**Data:** 2026-06-28  
**Projeto:** IMOBIIA | Norma IA  
**Escopo:** Sprint 1 (validação) + Sprint 2 (prerequisites e contratos)  
**Fonte da verdade:** Inspeção direta do código-fonte em `imobiia-frontend-v2/`

> **Nota sobre documentos de entrada:** O Documento 3 (Revisão de Arquitetura para Desacoplamento) foi
> recebido **truncado** — a mensagem foi cortada no início da seção "Padrões obrigatórios para todos
> os módulos do Sprint 2". As seções 4 e 5 deste AMD completam o que o Documento 3 havia iniciado,
> baseando-se na inspeção real do código.

---

## Índice

1. [Estado atual validado (Sprint 1)](#1-estado-atual-validado)
2. [Divergências entre documentos e código](#2-divergências-entre-documentos-e-código)
3. [Dívidas técnicas estruturais](#3-dívidas-técnicas-estruturais)
4. [Padrões obrigatórios (Sprint 2+)](#4-padrões-obrigatórios)
5. [Contratos dos módulos norma-lib](#5-contratos-dos-módulos-norma-lib)
6. [Prerequisitos técnicos por task do Sprint 2](#6-prerequisitos-técnicos-por-task)
7. [Riscos arquiteturais](#7-riscos-arquiteturais)
8. [Decisões pendentes para o Product Owner](#8-decisões-pendentes-para-o-product-owner)

---

## 1. Estado Atual Validado

### 1.1 Stack canônica (confirmada por inspeção de código)

| Camada | Tecnologia | Versão | Status |
|--------|-----------|--------|--------|
| Runtime | React | ^19.2.0 | ✅ Confirmado |
| Build | Vite + Rolldown | ^8.0.0 | ✅ Confirmado |
| Roteamento | TanStack Router | 1.170.16 | ✅ Confirmado, pinado |
| Estilização | Tailwind CSS | ^4.1.18 | ✅ Confirmado |
| Componentes | shadcn/ui (Radix) | via devDep | ✅ Confirmado |
| Banco / Auth | Supabase JS | ^2.108.2 | ✅ Confirmado |
| Linguagem | TypeScript | ^6.0.2 | ✅ Confirmado |
| Renderização | CSR puro (SPA) | — | ✅ Confirmado, sem SSR |

### 1.2 Arquitetura de autenticação (confirmada)

```
Supabase Auth
  └── Custom Access Token Hook
        └── app_metadata: { role, company_id }  ← injetado no JWT
              └── getAuthClaims()               ← lê do JWT local (zero network)
                    └── AuthClaims { userId, email, role, companyId }
```

O `companyId` e o `userId` estão **disponíveis no JWT em localStorage** sem nenhuma chamada de rede.
Esta é a propriedade arquitetural mais importante do sistema — documentada em `auth.ts:getAuthClaims()`.

**Resultado:** A necessidade de buscar `company_id` via `profiles` em funções de data layer é
redundante e desnecessária. Ver Seção 3.1.

### 1.3 Padrão de roteamento (confirmado)

```
src/routes/
  __root.tsx             ← providers globais, devtools gated by DEV
  index.tsx              ← beforeLoad: redirect('/auth/login')
  auth/
    login.tsx
    signup.tsx
  _authenticated.tsx     ← beforeLoad: refreshSession → getSession → redirect if null
  _authenticated/
    dashboard.tsx
    imoveis.tsx          ← layout wrapper
    imoveis.index.tsx    ← loader: listProperties()
    imoveis.novo.tsx     ← loader: static (sem dados)
    imoveis.$id.editar.tsx ← loader: getPropertyById(id)
    oportunidades.tsx    ← layout wrapper
    oportunidades.index.tsx ← loader: listLeads()
    oportunidades.novo.tsx  ← loader: listCorretores()
    oportunidades.$id.editar.tsx ← loader: Promise.all([getLeadById, listCorretores])
```

**Configurações do router** (`router.tsx`):
- `defaultPreload: 'intent'` — preload no hover/focus de links ✅
- `defaultPreloadStaleTime: 0` — loaders reexecutam em cada navegação ✅
- `scrollRestoration: true` ✅
- `autoCodeSplitting: true` (no plugin Vite) — code splitting por rota ✅

### 1.4 Data layer (confirmado)

| Arquivo | Entidade | Funções |
|---------|---------|---------|
| `src/lib/supabase.ts` | Cliente | `supabase` singleton |
| `src/lib/auth.ts` | Auth/Claims | `getSession`, `getAuthClaims`, `refreshSession`, `signUp`, `signIn`, `signOut`, `getCurrentUser`, `logError` |
| `src/lib/leads.ts` | Oportunidades | `listLeads`, `getLeadById`, `createLead`, `updateLead`, `listCorretores` |
| `src/lib/properties.ts` | Imóveis | `listProperties`, `getPropertyById`, `createProperty`, `updateProperty` |

### 1.5 Schema de banco (tabelas confirmadas via `database.types.ts`)

```
companies      → { id, name, cnpj, address, city, state, phone, website, logo_url, created_at, updated_at }
profiles       → { id, company_id, role, full_name, ... }  ← FK para auth.users e companies
leads          → { id, company_id, assigned_to, full_name, email, phone, source, status, budget_min,
                   budget_max, notes, created_at, updated_at }
properties     → { id, company_id, created_by, title, description, address, neighborhood, city,
                   property_type, status, area_m2, price, reference_code, created_at, updated_at }
audit_logs     → { id, company_id, admin_id, table_name, record_id, action, old_values,
                   new_values, created_at }
```

**Enums confirmados:**
- `lead_source`: enum no Supabase
- `lead_status`: enum no Supabase
- `property_type`: enum no Supabase
- `property_status`: enum no Supabase
- `audit_action`: enum no Supabase

### 1.6 Multi-tenancy (confirmado)

O isolamento de dados é feito por `company_id` com RLS no Supabase. O `company_id` é injetado
no JWT via Custom Access Token Hook e lido pelo cliente via `getAuthClaims().companyId`.

**Status de deploy:** `public/_redirects` existe com `/* /index.html 200`. SPA redirect resolvido. ✅

### 1.7 Itens novos encontrados (não documentados nos docs de entrada)

| Item | Arquivo | Descrição |
|------|---------|-----------|
| `useAuth` hook | `src/hooks/useAuth.ts` | Hook React para consumir AuthClaims em componentes. Assina `onAuthStateChange`. |
| `src/types/domain.ts` | `src/types/domain.ts` | Arquivo placeholder vazio — criado mas sem conteúdo. |
| `logError` helper | `src/lib/auth.ts:3-5` | `console.error` suprimido em produção via `import.meta.env.DEV`. |
| Favicon | `public/favicon.ico` | Presente. |
| `public/_redirects` | `public/_redirects` | SPA redirect (`/* /index.html 200`). |

---

## 2. Divergências Entre Documentos e Código

### 2.1 Divergências resolvidas (código mais avançado que os docs)

O Documento 3 afirma que `Corretor` não é derivado do schema DB:
> "Tipo manual não derivado do schema"

**Estado real do código (`leads.ts:20`):**
```typescript
export type Corretor = Pick<Database['public']['Tables']['profiles']['Row'], 'id' | 'full_name'>
```
✅ Já usa `Pick<>` do tipo gerado. A dívida técnica mencionada no doc já foi corrigida.

O Documento de Deploy Audit identificou `console.error` visível em produção em `auth.ts`.

**Estado real do código (`auth.ts:3-5`):**
```typescript
function logError(...args: Parameters<typeof console.error>) {
  if (import.meta.env.DEV) console.error(...args)
}
```
✅ Já suprimido em produção. A recomendação foi implementada.

O Documento de Deploy Audit identificou `@tanstack/react-devtools` em `dependencies`.

**Estado real do `package.json`:**
```json
"devDependencies": {
  "@tanstack/devtools-vite": "0.7.0",
  "@tanstack/react-devtools": "0.10.5",
  "@tanstack/react-router-devtools": "1.167.0",
  "@tanstack/router-plugin": "1.168.18",
  "shadcn": "4.11.0"
}
```
✅ Já movidos para `devDependencies`. Versões pinadas (sem `latest`).

### 2.2 Divergência ativa (código diverge do que deveria ser)

O Documento 3 afirma como "ajuste obrigatório" a criação de `getAuthContext()` para eliminar
os round-trips duplicados. **Esse helper não existe ainda.** A dívida técnica permanece ativa
nas funções `createLead`, `createProperty` e `listCorretores`. Ver Seção 3.1.

### 2.3 Afirmação do Roadmap v2 não implementável sem decisão prévia

> "Task 2.1.2: CRUD de Corretores + convites"

A adição de novos corretores à plataforma requer criação de usuários no Supabase Auth, o que
exige a **service role key** (não a anon key). A anon key disponível no frontend NÃO tem permissão
para criar usuários via `supabase.auth.admin.inviteUserByEmail()`. Esta task tem um **prerequisito
arquitetural não resolvido**. Ver Seção 6 e Seção 8.

---

## 3. Dívidas Técnicas Estruturais

### 3.1 ❌ Round-trips desnecessários no data layer [BLOQUEADOR DE EXTRAÇÃO]

**Impacto:** Bloqueia extração de `norma-crm-core` como módulo reutilizável. Afeta performance.  
**Severidade:** Alta — o padrão se reproduzirá em TODAS as funções de criação do Sprint 2.

O padrão atual em `createLead` e `createProperty`:

```typescript
// ❌ 3 chamadas de rede para criar 1 registro:
const { data: { user } } = await supabase.auth.getUser()   // → rede (Supabase Auth server)
const { data: profile } = await supabase
  .from('profiles').select('company_id').eq('id', user.id).single()  // → DB
const { data } = await supabase.from('leads').insert({...})  // → DB
```

O padrão correto, usando `getAuthClaims()` que lê do JWT em localStorage:

```typescript
// ✅ 1 chamada de rede (apenas o insert):
const claims = await getAuthClaims()
if (!claims?.companyId) throw new Error('Não autenticado')
const { data } = await supabase.from('leads').insert({
  ...formData,
  company_id: claims.companyId,
}).select().single()
```

O mesmo padrão afeta `listCorretores` — 2 chamadas desnecessárias antes do select de profiles.

**Fix obrigatório antes do Sprint 2:** implementar `getAuthContext()` em `auth.ts` e refatorar
as 4 funções afetadas (`createLead`, `createProperty`, `listCorretores`, e qualquer nova função
de criação criada no Sprint 2).

**Definição canônica de `getAuthContext()`:**
```typescript
// src/lib/auth.ts — adicionar:
export async function getAuthContext(): Promise<AuthClaims> {
  const claims = await getAuthClaims()
  if (!claims?.companyId) throw new Error('Não autenticado')
  return claims
}
```

### 3.2 ⚠️ `updated_at` setado manualmente [TECH DEBT MÉDIO]

`updateLead` e `updateProperty` fazem:
```typescript
.update({ ...formData, updated_at: new Date().toISOString() })
```

Deveria ser tratado por trigger de banco:
```sql
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;
```

**Impacto imediato:** Nulo — funciona corretamente. Mas cria inconsistência quando o update
vier de um Edge Function ou de n8n (que não usará o mesmo padrão).  
**Quando corrigir:** Sprint 3, junto com a primeira Edge Function de produção.

### 3.3 ⚠️ `select('*')` em todas as queries de listagem [TECH DEBT BAIXO]

`listLeads()` e `listProperties()` fazem `select('*')`, retornando todos os campos incluindo
`notes` e `description` que são longos e não são exibidos nas tabelas de listagem.

**Impacto atual:** Baixo (volume de dados ainda pequeno para demo). Proibido em produção real.  
**Quando corrigir:** Junto com a implementação de paginação (Sprint 3).

### 3.4 ⚠️ Ausência de paginação [TECH DEBT MÉDIO]

`listLeads()` e `listProperties()` retornam todos os registros sem limite. O Supabase por
default retorna até 1000 rows, mas sem paginação o app quebrará silenciosamente em bases maiores.

**Impacto atual:** Nulo (ambiente de demo). Crítico em produção com dados reais.  
**Quando corrigir:** Sprint 3, antes de qualquer integração de captação de leads externos.

### 3.5 ⚠️ `@tanstack/react-query` instalado mas não utilizado

O pacote está em `dependencies: "^5.101.0"` mas nenhum arquivo no projeto o importa. Foi
instalado antecipadamente, presumivelmente para as chamadas ao Claude API no Sprint 2.

**Status:** Aceitável. Não causa problemas. Será justificado quando as features de IA forem
implementadas — React Query é a escolha correta para gerenciar estado de requisições com
loading/error/cache nos componentes de IA.

### 3.6 ⚠️ `src/types/domain.ts` vazio

Arquivo criado como placeholder. Nenhum tipo de domínio foi movido para cá ainda.  
**Quando usar:** Ao implementar `getAuthContext()` e ao criar tipos compartilhados entre
módulos (ex: `AiScore`, `AiSummary` para os módulos de IA do Sprint 2).

---

## 4. Padrões Obrigatórios

Esta seção completa o que o Documento 3 havia iniciado antes do truncamento. Todos os módulos
produzidos a partir do Sprint 2 devem seguir estes padrões sem exceção.

### 4.1 Padrão de autenticação em funções data layer

**Regra:** Nenhuma função de data layer pode chamar `supabase.auth.getUser()` ou fazer
`profiles.select('company_id')` para obter o contexto do usuário. Usar exclusivamente
`getAuthContext()` (a ser implementado — ver Seção 3.1).

```typescript
// ✅ CORRETO — data layer Sprint 2+
import { getAuthContext } from '#/lib/auth'

export async function createSomething(data: FormData): Promise<Something> {
  const { userId, companyId } = await getAuthContext()
  const { data: result, error } = await supabase
    .from('somethings')
    .insert({ ...data, company_id: companyId, created_by: userId })
    .select()
    .single()
  if (error) throw new DataLayerError('createSomething', error)
  return result
}

// ❌ PROIBIDO — jamais replicar este padrão
const { data: { user } } = await supabase.auth.getUser()
const { data: profile } = await supabase.from('profiles').select('company_id')...
```

### 4.2 Padrão de tratamento de erro com contexto

O Documento 3 iniciou esta seção. Baseando-se no `logError` já implementado e no padrão de
throw simples (`if (error) throw error`) das funções atuais, o padrão obrigatório para Sprint 2:

```typescript
// src/lib/errors.ts — criar este arquivo no Sprint 2
export class DataLayerError extends Error {
  constructor(
    public readonly context: string,
    public readonly cause: unknown
  ) {
    super(`[${context}] ${cause instanceof Error ? cause.message : String(cause)}`)
    this.name = 'DataLayerError'
  }
}

// Uso em data layer:
if (error) throw new DataLayerError('listLeads', error)

// logError já está correto em auth.ts — replicar para novos módulos:
function logError(context: string, error: unknown) {
  if (import.meta.env.DEV) console.error(`[${context}]`, error)
}
```

**Benefício:** O `errorComponent` do TanStack Router receberá erros com contexto legível
(`[listLeads] ...`), facilitando diagnóstico em produção.

### 4.3 Padrão de tipagem

**Regra:** Nenhum tipo de domínio pode ser declarado manualmente se pode ser derivado do schema
gerado pelo Supabase CLI (`database.types.ts`).

```typescript
// ✅ CORRETO
export type Lead = Database['public']['Tables']['leads']['Row']
export type Corretor = Pick<Database['public']['Tables']['profiles']['Row'], 'id' | 'full_name'>

// ❌ PROIBIDO — tipo manual sem derivação do schema
export type Corretor = { id: string; full_name: string }
```

Para tipos de resposta de IA (que não existem no schema), usar `src/types/domain.ts`:
```typescript
// src/types/domain.ts
export type AiScore = 'quente' | 'morno' | 'frio'
export interface AiQualification {
  score: AiScore
  reasoning: string
  suggested_action: string
  generated_at: string
}
export interface AiSummary {
  content: string
  generated_at: string
}
```

### 4.4 Padrão de loader (TanStack Router)

**Regra:** Todo dado assíncrono necessário na rota deve ser carregado no `loader`. Nenhum
`useEffect` + `useState` para fetch inicial.

```typescript
// ✅ CORRETO — dados carregados no loader
export const Route = createFileRoute('/_authenticated/x')({
  loader: ({ params }) => getSomething(params.id),
  pendingComponent: () => <div>Carregando...</div>,
  errorComponent: ({ error }) => (
    <div>Erro: {error instanceof DataLayerError ? error.message : 'Erro desconhecido'}</div>
  ),
  component: XPage,
})

function XPage() {
  const data = Route.useLoaderData()  // ← sem useState, sem useEffect
  ...
}

// ❌ PROIBIDO — fetch no componente
function XPage() {
  const [data, setData] = useState(null)
  useEffect(() => { fetch().then(setData) }, [])  // nunca
}
```

**Exceção documentada:** O hook `useAuth()` (`src/hooks/useAuth.ts`) usa `useEffect` intencionalmente
porque precisa assinar `onAuthStateChange` — este é um caso legítimo de efeito colateral reativo,
não uma busca de dados inicial.

### 4.5 Padrão de componente de formulário

```typescript
// Props obrigatórias para qualquer componente de formulário reutilizável:
interface XFormProps {
  initialValues?: Partial<XFormData>
  onSubmit: (data: XFormData) => Promise<void>
  isLoading: boolean
  // dados de select/dropdown vêm via props, nunca via fetch interno:
  options?: OptionType[]
}
```

### 4.6 Padrão de integração com IA (Claude API) — Sprint 2

**Regra crítica:** A Anthropic API key **JAMAIS** pode ser exposta no bundle do frontend. O
frontend é CSR puro — qualquer secret no código-fonte fica visível no browser.

Toda chamada ao Claude API deve passar por uma **Supabase Edge Function**:

```
Browser → Supabase Edge Function (Deno, com ANTHROPIC_API_KEY como secret)
                                   → Claude API
                                   ← resposta
Browser ← resposta estruturada
```

O frontend chama a Edge Function via:
```typescript
const { data, error } = await supabase.functions.invoke('qualify-lead', {
  body: { leadId: lead.id }
})
```

**Implicação:** Toda task de IA do Sprint 2 requer que a Edge Function correspondente seja
criada e deployada no Supabase antes do componente React ser implementado.

---

## 5. Contratos dos Módulos norma-lib

### 5.1 `norma-auth` — PRONTO PARA EXTRAÇÃO

**Status:** ✅ Completamente extraível — zero acoplamento ao domínio imobiliário.

**O que compõe o módulo:**
```
src/lib/auth.ts          ← completo, sem referências imobiliárias
src/hooks/useAuth.ts     ← hook React genérico
```

**Interface pública:**
```typescript
// Tipos
export type UserRole = 'admin' | 'gestor' | 'corretor'
export interface AuthClaims { userId, email, role, companyId }

// Funções
export function getSession(): Promise<Session | null>
export function getAuthClaims(): Promise<AuthClaims | null>
export function getAuthContext(): Promise<AuthClaims>  // ← a implementar (Seção 3.1)
export function refreshSession(): Promise<Session | null>
export function signUp(email, password, fullName, companyName): Promise<AuthResponse>
export function signIn(email, password): Promise<AuthResponse>
export function signOut(): Promise<void>
export function getCurrentUser(): Promise<User | null>

// Hook
export function useAuth(): { claims, loading, error, isAuthenticated }
```

**Prerequisito de portabilidade:** O módulo assume que o Supabase project foi configurado com
Custom Access Token Hook injetando `role` e `company_id` em `app_metadata`. Este setup de
infraestrutura deve ser documentado no README do módulo.

**Ajuste de observabilidade recomendado (Documento 3):** Tornar o contexto explícito:
```typescript
// Atual:
logError('Error getting session:', error)
// Recomendado:
logError('auth.getSession', error)
```

### 5.2 `norma-crm-core` — EXTRAÇÃO BLOQUEADA

**Status:** ❌ Não extraível até a Seção 3.1 ser resolvida.

**Bloqueador:** As funções `createLead`, `createProperty` e `listCorretores` usam
`supabase.auth.getUser()` e `profiles.select()` internamente — padrão que não pode ser
portado para outros domínios sem carregar essa dívida junto.

**Pós-fix (após `getAuthContext()`):**
```typescript
// Interface pública após refatoração:
export type EntityFormData = { /* genérico, sem nomes imobiliários */ }
export async function createEntity(table: string, data: EntityFormData): Promise<Entity>
export async function updateEntity(table: string, id: string, data: EntityFormData): Promise<Entity>
export async function listEntities(table: string): Promise<Entity[]>
export async function getEntityById(table: string, id: string): Promise<Entity>
```

**O que bloqueará a abstração final:** Os nomes de tabela (`leads`, `properties`) e os campos
específicos (`budget_min`, `reference_code`) são imobiliários. A extração como `norma-crm-core`
requer uma camada de configuração por domínio, não apenas renomear funções.

### 5.3 `norma-ai-qualifier` — PREREQUISITOS DEFINIDOS

**Status:** 🔵 Não iniciado. Prerequisitos claros.

**Prerequisitos obrigatórios antes de implementar:**
1. Supabase Edge Function `qualify-lead` deployada com `ANTHROPIC_API_KEY` como secret
2. `getAuthContext()` implementado (Seção 3.1)
3. Decisão de PO: onde armazenar o score (campo na tabela `leads` ou tabela separada `ai_scores`)

**Interface esperada:**
```typescript
// src/lib/ai.ts — a criar no Sprint 2
export async function qualifyLead(leadId: string): Promise<AiQualification>

// Edge Function: supabase/functions/qualify-lead/index.ts
// Recebe: { leadId }
// Retorna: AiQualification { score, reasoning, suggested_action, generated_at }
```

**Prompt canônico (a refinar com o PO):**
O prompt enviado ao Claude deve incluir: `full_name`, `email`, `source`, `budget_min`,
`budget_max`, `notes`, `status` atual. Retorno esperado em JSON estruturado.

### 5.4 `norma-ai-summarizer` — PREREQUISITOS DEFINIDOS

**Status:** 🔵 Não iniciado. Prerequisitos claros.

**Prerequisitos obrigatórios:**
1. Task 2.3.1 (Detalhes de oportunidade) implementada — o resumo vive na página de detalhes
2. Supabase Edge Function `summarize-lead` deployada
3. Decisão de PO: persistir histórico de resumos ou apenas o mais recente

**Interface esperada:**
```typescript
export async function summarizeLead(leadId: string): Promise<AiSummary>
```

### 5.5 `norma-dashboard` — PREREQUISITOS DEFINIDOS

**Status:** 🔵 Não iniciado. Prerequisitos claros.

**Prerequisitos obrigatórios:**
1. Queries de agregação no Supabase (não `select('*')` da tabela inteira)
2. Decisão: queries via PostgREST nativo ou Supabase RPC (funções SQL)

**Queries necessárias:**
```sql
-- Leads por status
SELECT status, COUNT(*) FROM leads WHERE company_id = $1 GROUP BY status

-- Leads por corretor (top N)
SELECT assigned_to, profiles.full_name, COUNT(*) 
FROM leads JOIN profiles ON leads.assigned_to = profiles.id
WHERE leads.company_id = $1 GROUP BY assigned_to, profiles.full_name

-- Taxa de conversão (status 'fechado_ganho' / total)
SELECT COUNT(*) FILTER (WHERE status = 'fechado_ganho') * 100.0 / COUNT(*) FROM leads
WHERE company_id = $1
```

**Recomendação:** Criar `src/lib/analytics.ts` separado de `leads.ts` — responsabilidades
distintas (CRUD vs. agregação analítica).

### 5.6 `norma-whatsapp-notify` — Sprint 3

**Implementação:** Exclusivamente via n8n. O frontend não tem papel direto neste módulo —
o n8n assina eventos do Supabase (webhook ou Realtime) e envia a mensagem via API do WhatsApp.

**Interface de integração (Supabase → n8n):**
```
Supabase Database Webhook → n8n trigger → formata mensagem → WhatsApp API
Evento: INSERT em leads (nova oportunidade)
Evento: UPDATE em leads WHERE status mudou
```

### 5.7 `norma-team-management` (Task 2.1.2) — PREREQUISITO CRÍTICO

**Status:** ⛔ Bloqueado por restrição de infraestrutura.

**Problema:** Criar um novo corretor = criar um usuário no Supabase Auth. Isso requer
`supabase.auth.admin.inviteUserByEmail()`, que só funciona com a **service role key**.
A anon key usada no frontend não tem essa permissão por design de segurança.

**Opções arquiteturais (decisão do PO — Seção 8):**

| Opção | Complexidade | Custo | Adequação para portfólio |
|-------|-------------|-------|--------------------------|
| A — Supabase Edge Function com service role | Baixa | Zero (incluso) | ✅ Recomendada |
| B — Fluxo n8n de convite | Média | Depende do plano n8n | ✅ Demonstra automação |
| C — Admin convida manualmente pelo Supabase Dashboard | Nenhuma | Zero | ⚠️ Não demonstrável |

---

## 6. Prerequisitos Técnicos por Task

### Sprint 2 — Task 2.1.1: Dashboard analítico

**Prerequisitos de código:**
- [ ] `getAuthContext()` implementado (Seção 3.1)
- [ ] `src/lib/analytics.ts` criado com funções de agregação
- [ ] Adicionar "Corretores" e "Dashboard" (expandido) ao `navItems` em `_authenticated.tsx`

**Prerequisitos de infraestrutura:** Nenhum além do que já existe.

**Dependência de PO:** Quais métricas exibir (ver Seção 8).

---

### Sprint 2 — Task 2.1.2: CRUD de Corretores + convites

**Prerequisitos de código:**
- [ ] `getAuthContext()` implementado
- [ ] Decisão sobre a opção arquitetural (Seção 5.7)
- [ ] Se Edge Function: `supabase/functions/invite-corretor/index.ts` criada

**Prerequisito de infraestrutura:** Supabase CLI configurado localmente para desenvolver e
deployar Edge Functions (`supabase functions deploy invite-corretor`).

**Dependência de PO:** Escolha da opção A, B ou C (Seção 8). **Bloqueante.**

---

### Sprint 2 — Task 2.2.1: Qualificação de leads com IA

**Prerequisitos de código:**
- [ ] `getAuthContext()` implementado
- [ ] `src/types/domain.ts` populado com `AiScore` e `AiQualification`
- [ ] `src/lib/ai.ts` criado com `qualifyLead()`
- [ ] Edge Function `qualify-lead` deployada no Supabase

**Prerequisitos de infraestrutura:**
- [ ] `ANTHROPIC_API_KEY` configurada como secret no Supabase: `supabase secrets set ANTHROPIC_API_KEY=...`
- [ ] Decisão sobre armazenamento do score (campo em `leads` ou tabela `ai_scores`)

**Dependência de PO:** Campo na tabela `leads` vs. tabela separada (Seção 8).

---

### Sprint 2 — Task 2.2.2: Resumo inteligente

**Prerequisitos de código:**
- [ ] Task 2.3.1 (Detalhes de oportunidade) implementada
- [ ] Edge Function `summarize-lead` deployada

**Prerequisitos de infraestrutura:**
- [ ] `ANTHROPIC_API_KEY` configurada (se não estiver da task anterior)

**Dependência de PO:** Persistir histórico ou apenas o último resumo (Seção 8).

---

### Sprint 2 — Task 2.3.1: Página de detalhes de oportunidade

**Prerequisitos de código:**
- [ ] `getAuthContext()` implementado (para join com profiles se precisar do nome do corretor)
- [ ] `getLeadById()` já existe ✅ — mas retorna apenas `assigned_to` como UUID
- [ ] Precisará de join para exibir o nome do corretor:
  ```typescript
  // Opção A — query com join (uma chamada):
  supabase.from('leads').select('*, profiles!assigned_to(full_name)').eq('id', id)
  // Opção B — Promise.all (padrão já usado em editar):
  Promise.all([getLeadById(id), listCorretores()])
  ```

**Nenhum prerequisito de infraestrutura.**

---

### Sprint 2 — Task 2.3.2: Histórico de status

**Prerequisitos de código:**
- [ ] Task 2.3.1 implementada (histórico vive na página de detalhes)
- [ ] Decisão: tabela `lead_status_history` no Supabase ou usar `audit_logs` existente

**Nota:** A tabela `audit_logs` já existe no schema com `old_values` e `new_values` como JSON.
Se os triggers de audit estiverem configurados, o histórico de status pode ser lido de lá
sem criar nova tabela.

---

## 7. Riscos Arquiteturais

### 7.1 🔴 ALTO — Vite 8 + Rolldown em produção

**Risco:** Vite 8 foi lançado recentemente e usa Rolldown (bundler em Rust) em vez do Rollup.
O Rolldown ainda está em maturação e pode ter comportamentos diferentes em edge cases
(tree-shaking, dynamic imports, HMR). O build falha no ambiente Linux do sandbox porque os
binários nativos Windows não são compatíveis.

**Mitigação atual:** O build é executado na máquina local (Windows) e no Vercel (que instala
fresh). Não há risco real de produção, mas é um risco de processo (onboarding de novos devs,
CI/CD em Linux).

**Ação recomendada:** Verificar se o Vercel (Node.js runtime) constrói corretamente na primeira
execução de CI/CD. Documentar o requisito de `npm install` antes do build em ambientes Linux.

### 7.2 🟡 MÉDIO — `defaultPreloadStaleTime: 0` e round-trips do data layer

**Risco:** Com `defaultPreloadStaleTime: 0`, o TanStack Router reexecuta os loaders em cada
navegação. Enquanto as funções de criação fazem 3 round-trips (Seção 3.1), o usuário que
navega entre páginas com frequência acumula múltiplas chamadas desnecessárias ao Supabase Auth.

**Mitigação:** A correção da Seção 3.1 (`getAuthContext()`) resolve este risco indiretamente.

### 7.3 🟡 MÉDIO — Ausência de RLS verificado no código

**Risco:** O código assume que o RLS está ativo e corretamente configurado no Supabase. Se
uma tabela estiver sem RLS, qualquer usuário autenticado poderia acessar dados de outras empresas.
Não é possível verificar isso via código-fonte frontend.

**Ação obrigatória (pré-demo):** Confirmar via Supabase Dashboard SQL Editor:
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('leads', 'properties', 'profiles', 'companies', 'audit_logs');
-- rowsecurity deve ser TRUE em todas
```

### 7.4 🟡 MÉDIO — `@tanstack/react-query` instalado mas sem uso

**Risco:** Se o Sprint 2 introduzir chamadas ao Claude API via Edge Function sem usar React
Query (ex: `useState` + `useEffect` ad-hoc), o padrão de estado de loading/error ficará
inconsistente entre componentes.

**Ação recomendada:** Decidir **antes** do Sprint 2 AI tasks se React Query será usado para
gerenciar chamadas às Edge Functions, e documentar como padrão obrigatório.

### 7.5 🟢 BAIXO — TypeScript 6.0.2 (bleeding edge)

TypeScript 6 introduz mudanças na resolução de módulos e no comportamento de `strict`. O
projeto compila sem erros (`tsc --noEmit` limpo), mas atualizações de patch podem introduzir
novos erros de tipo silenciosamente.

**Mitigação atual:** Versão pinada com `^6.0.2`. Risco gerenciado.

---

## 8. Decisões Pendentes para o Product Owner

As seguintes questões têm impacto arquitetural direto e não podem ser resolvidas pelo time
técnico sem alinhamento de produto. Cada uma bloqueia ou influencia uma ou mais tasks do Sprint 2.

---

**Decisão 1 — Estratégia de convite de corretores (Task 2.1.2)**

A criação de corretores requer permissão de administrador no Supabase Auth (service role key),
que não pode existir no frontend. Três opções disponíveis:

- **Opção A** *(recomendada)*: Supabase Edge Function com a service role key como secret.
  Zero custo adicional, implementação de ~50 linhas de Deno, demonstra infraestrutura serverless.
- **Opção B**: Fluxo n8n de convite. Demonstra automação mas adiciona dependência de n8n e
  pode ter custo dependendo do plano.
- **Opção C**: Admin cria usuários manualmente pelo Supabase Dashboard. Sem código, mas não
  é demonstrável como feature do produto.

**Impacto:** Escolher A ou B define se o projeto terá Edge Functions configuradas no Sprint 2
(o que facilita também as tasks de IA).

---

**Decisão 2 — Armazenamento do score de qualificação de IA (Task 2.2.1)**

Quando o Claude classifica um lead como quente/morno/frio, onde o resultado é armazenado?

- **Opção A** *(simples)*: Adicionar coluna `ai_score` e `ai_score_reason` diretamente na
  tabela `leads`. Requer migration. O score mais recente fica acessível em qualquer query.
- **Opção B** *(histórico completo)*: Criar tabela `ai_qualifications(id, lead_id, score,
  reasoning, suggested_action, generated_at)`. Mantém histórico de todas as qualificações.
  Mais complexo mas demonstra evolução temporal.

**Impacto:** Define a migration de banco necessária antes de implementar a Task 2.2.1.

---

**Decisão 3 — Persistência do resumo inteligente (Task 2.2.2)**

- **Opção A**: Armazenar apenas o último resumo (campo `last_summary` em `leads`).
- **Opção B**: Histórico de resumos em tabela separada `ai_summaries(id, lead_id, content,
  generated_at)`. Permite mostrar "Resumos anteriores" na interface.

**Impacto:** Define a migration de banco e a complexidade da UI.

---

**Decisão 4 — Métricas do dashboard (Task 2.1.1)**

O Roadmap menciona "cards conectados ao Supabase, gráfico de pipeline, taxa de conversão por
corretor". Definir o conjunto exato de métricas evita retrabalho de queries:

- Quantos cards de KPI? (ex: Total de leads, Leads ativos, Taxa de conversão, Imóveis ativos)
- Gráfico de pipeline: por status ou por tempo?
- Filtro por período no dashboard (últimos 30 dias, 90 dias, tudo)?
- Exibir métricas de imóveis ou apenas de leads?

---

**Decisão 5 — Biblioteca de gráficos**

O dashboard precisará de pelo menos um gráfico. `recharts` está disponível no projeto
(via `@tanstack/react-query` não, mas pode ser adicionado). Opções:

- **`recharts`**: API React-first, tamanho razoável (~150KB), SSR-safe
- **`chart.js` + wrapper**: Mais popular, maior ecossistema
- **`visx` (Airbnb)**: Mais customizável, maior curva de aprendizado

**Impacto:** Baixo — qualquer escolha funciona. Mas deve ser decidido antes de implementar
a Task 2.1.1 para que o PRD já especifique o componente.

---

## Apêndice — Inventário de Arquivos (Sprint 1, estado final)

```
imobiia-frontend-v2/
├── public/
│   ├── _redirects          ← SPA redirect (/* /index.html 200)
│   ├── favicon.ico
│   └── manifest.json
├── src/
│   ├── components/
│   │   ├── lead-form.tsx
│   │   ├── property-form.tsx
│   │   └── ui/
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       ├── input.tsx
│   │       └── label.tsx
│   ├── hooks/
│   │   └── useAuth.ts      ← NEW — hook para AuthClaims + onAuthStateChange
│   ├── lib/
│   │   ├── auth.ts         ← norma-auth core
│   │   ├── database.types.ts ← gerado pelo Supabase CLI (não editar manualmente)
│   │   ├── leads.ts        ← norma-crm-core (parcial, ver Seção 3.1)
│   │   ├── properties.ts   ← norma-crm-core (parcial, ver Seção 3.1)
│   │   ├── supabase.ts     ← singleton do cliente
│   │   └── utils.ts
│   ├── routes/
│   │   ├── __root.tsx
│   │   ├── index.tsx       ← redirect para /auth/login
│   │   ├── auth/
│   │   │   ├── login.tsx
│   │   │   └── signup.tsx
│   │   └── _authenticated/ ← guard: refreshSession → getSession
│   │       ├── _authenticated.tsx
│   │       ├── dashboard.tsx
│   │       ├── imoveis.tsx
│   │       ├── imoveis.index.tsx
│   │       ├── imoveis.novo.tsx
│   │       ├── imoveis.$id.editar.tsx
│   │       ├── oportunidades.tsx
│   │       ├── oportunidades.index.tsx
│   │       ├── oportunidades.novo.tsx
│   │       └── oportunidades.$id.editar.tsx
│   ├── types/
│   │   ├── domain.ts       ← placeholder vazio — popular no Sprint 2
│   │   └── index.ts
│   ├── main.tsx
│   ├── router.tsx
│   ├── routeTree.gen.ts    ← gerado pelo TanStack Router (não editar)
│   └── styles.css
├── .env.example            ← commitado com placeholders
├── .env.local              ← credenciais reais (gitignored via *.local)
├── .gitignore
├── index.html
├── package.json            ← versões pinadas, devtools em devDependencies
├── tsconfig.json
└── vite.config.ts          ← sourcemap: false, chunkSizeWarningLimit: 600
```

---

*IMOBIIA Architecture Master Document v1.0 — Norma IA — 2026-06-28*  
*Próxima revisão: após Sprint 2, Decisões 1–5 resolvidas, getAuthContext() implementado.*
