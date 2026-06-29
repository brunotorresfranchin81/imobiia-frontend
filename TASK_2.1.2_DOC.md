# DOCUMENTAÇÃO OFICIAL — Task 2.1.2
## Gestão de Equipe — Convite e Listagem de Corretores
**Projeto:** IMOBIIA | Norma IA
**Sprint:** 2
**Status:** Pronto para Implementação
**Arquiteto:** Claude — Arquiteto Técnico Sênior / PMO
**Data:** 2026-06-29

---

## 1. Resumo Executivo

### 1.1 Objetivo da Task 2.1.2
Implementar o módulo de gestão de equipe do IMOBIIA, permitindo que administradores e gestores convidem corretores por email, e que todos os usuários autenticados visualizem a lista de corretores da sua empresa. O convite é processado por uma Supabase Edge Function que utiliza a service role key para emitir o convite via Supabase Auth, e um trigger de banco de dados existente cria automaticamente o profile do corretor com o company_id correto.

### 1.2 Escopo

- Listagem de corretores da empresa autenticada (Nome, Função, Status Ativo/Inativo)
- Formulário de convite de novo corretor (email + nome)
- Edge Function `invite-corretor` com verificação de permissão (admin ou gestor da mesma empresa)
- Ativação/desativação de corretor existente
- Integração com trigger `on_auth_user_created` existente para criação automática de profile
- Módulo `src/lib/corretores.ts` seguindo padrão DataLayerError + getAuthContext()
- Rotas TanStack Router: layout, listagem, formulário de convite
- Documentação do módulo `norma-team-management` para reutilização

### 1.3 Fora do Escopo

- Email do corretor na listagem (decisão PO: não implementar — profiles não tem coluna email)
- Edição de dados do corretor (nome, telefone, avatar)
- Remoção definitiva de corretor (apenas desativação)
- Reenvio de convite
- Convite em lote (múltiplos emails)
- Gestão de permissões granulares além de role
- UI de onboarding pós-convite
- Notificações em tempo real de aceitação de convite

---

## 2. Arquitetura da Solução

### 2.1 Fluxo Completo do Convite

```
[Admin/Gestor no Browser]
         │
         │ 1. Preenche email + nome do corretor
         │ 2. Submete formulário (POST /corretores/convidar)
         ▼
[Frontend — corretores.convidar.tsx]
         │
         │ 3. Chama inviteCorretor(email, fullName)
         ▼
[src/lib/corretores.ts — inviteCorretor()]
         │
         │ 4. Lê companyId via getAuthContext() (JWT local, zero network)
         │ 5. POST para Edge Function com Authorization: Bearer <JWT>
         ▼
[supabase/functions/invite-corretor/index.ts]
         │
         │ 6. verify_jwt = true → Supabase valida JWT automaticamente
         │ 7. Extrai company_id e role de req.headers['authorization']
         │    via supabase.auth.getUser(jwt) com o client anon
         │ 8. Verifica: role === 'admin' || role === 'gestor'
         │ 9. Cria adminClient com SERVICE_ROLE_KEY (nunca exposta ao browser)
         │ 10. adminClient.auth.admin.inviteUserByEmail(email, {
         │       data: {
         │         full_name: fullName,
         │         company_id: callerCompanyId,
         │         role: 'corretor',
         │       }
         │     })
         ▼
[Supabase Auth — auth.users]
         │
         │ 11. Cria usuário em auth.users com raw_user_meta_data =
         │     { full_name, company_id, role: 'corretor' }
         │ 12. Envia email de convite ao corretor
         │ 13. Dispara trigger on_auth_user_created
         ▼
[PostgreSQL — Trigger on_auth_user_created]
         │
         │ 14. Lê NEW.id, NEW.raw_user_meta_data
         │ 15. INSERT INTO profiles (id, company_id, full_name, role, active)
         │     VALUES (NEW.id, meta.company_id, meta.full_name, meta.role, true)
         ▼
[Corretor — Email Recebido]
         │
         │ 16. Clica no link do convite
         │ 17. Define sua senha
         │ 18. Faz login
         ▼
[Supabase Auth — Custom Access Token Hook]
         │
         │ 19. Injeta company_id e role no app_metadata do JWT
         ▼
[Corretor autenticado]
         │ 20. JWT contém company_id → acesso correto à empresa
         │ 21. Aparece na listagem de corretores via listCorretores()
```

### 2.2 Diagrama Textual da Arquitetura

```
┌─────────────────────────────────────────────────────────────────┐
│                        BROWSER (CSR)                            │
│                                                                 │
│  corretores.tsx (layout)                                        │
│    ├── corretores.index.tsx ──── src/lib/corretores.ts          │
│    │     [listagem: Nome, Função, Status]   │                   │
│    └── corretores.convidar.tsx              │                   │
│          [form: email + nome]               │                   │
│                                             │                   │
│  src/lib/corretores.ts                      │                   │
│    ├── listCorretores()    ─────────────────┼─► Supabase JS     │
│    ├── inviteCorretor()    ─────────────────┼─► fetch() Edge Fn │
│    └── toggleCorretorActive() ─────────────┼─► Supabase JS     │
└─────────────────────────────────────────────────────────────────┘
                                             │
              ┌──────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  SUPABASE EDGE FUNCTION (Deno)                  │
│                                                                 │
│  invite-corretor/index.ts                                       │
│    ├── verify_jwt = true  (config.toml — automático)            │
│    ├── Valida role: admin | gestor                              │
│    ├── adminClient (SERVICE_ROLE_KEY — secret)                  │
│    └── auth.admin.inviteUserByEmail()                           │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     SUPABASE (PostgreSQL)                       │
│                                                                 │
│  auth.users                                                     │
│    └── raw_user_meta_data: { company_id, role, full_name }      │
│          │                                                      │
│          ▼  trigger: on_auth_user_created                       │
│  public.profiles                                                │
│    └── (id, company_id, full_name, role, active=true)          │
│                                                                 │
│  RLS: authenticated pode SELECT profiles WHERE company_id = own │
│  RLS: admin/gestor pode UPDATE profiles.active (a definir)      │
└─────────────────────────────────────────────────────────────────┘
```

### 2.3 Componentes Envolvidos

**Edge Function `invite-corretor`**
- Runtime: Deno (via Supabase Edge Functions)
- Autenticação: `verify_jwt = true` no `config.toml` — Supabase rejeita requests sem JWT válido antes de executar o código
- Autorização: verificação explícita de role no corpo da função
- Cliente admin: criado com `SUPABASE_SERVICE_ROLE_KEY` (env secret) — nunca exposto ao browser
- Responsabilidade única: validar permissão + emitir convite com metadados corretos

**Supabase Auth**
- `inviteUserByEmail()` cria o usuário em `auth.users` com status `invited`
- `raw_user_meta_data` recebe `{ company_id, role, full_name }` passados pela Edge Function
- Email de convite enviado pelo Supabase automaticamente (template configurável no dashboard)
- Link do convite expira em 24h (padrão Supabase — configurável em Auth Settings)

**Trigger `on_auth_user_created`**
- Dispara em INSERT na tabela `auth.users`
- Lê `NEW.raw_user_meta_data` para extrair `company_id`, `role`, `full_name`
- Cria o registro em `public.profiles`
- **CRÍTICO:** O trigger deve funcionar para ambos os fluxos: `signUp()` (onde `company_id` vem do meta) e `inviteUserByEmail()` (mesmo padrão). Verificação obrigatória na Etapa 0.

**JWT Claims / Custom Access Token Hook**
- Após o corretor fazer login, o Custom Access Token Hook injeta `company_id` e `role` em `app_metadata`
- `getAuthContext()` lê `app_metadata` do JWT em localStorage — zero network calls
- RLS em `profiles` filtra por `company_id` automaticamente via `auth.jwt() ->> 'company_id'`

**Service Role Key**
- Nunca enviada ao browser
- Armazenada como secret do Supabase: `supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<value>`
- Acessada na Edge Function via `Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')`

**RLS em `profiles`**
- SELECT existente: authenticated users veem apenas profiles da própria empresa
- UPDATE a criar: apenas admin e gestor podem alterar `active` de profiles da própria empresa

---

## 3. Alterações Necessárias

### 3.1 Banco de Dados

**3.1.1 Verificar trigger `on_auth_user_created` (Etapa 0 — sem migration se já correto)**

Verificar se a função PL/pgSQL do trigger trata corretamente o campo `raw_user_meta_data` para o fluxo de convite. O corpo esperado da função é:

```sql
-- Verificar (NÃO implementar — apenas confirmar existência e comportamento):
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, company_id, full_name, role, active)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'company_id',
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(
      (NEW.raw_user_meta_data->>'role')::user_role,
      'corretor'::user_role
    ),
    true
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

Se o trigger existente não incluir `company_id` ou `role`, uma migration é necessária (ver risco R-01).

**3.1.2 Nova política RLS — UPDATE em profiles (Migration obrigatória)**

```sql
-- Migration: M-05_rls_profiles_update_active.sql
-- Permite que admin e gestor desativem/ativem corretores da MESMA empresa
CREATE POLICY "admin_gestor_can_update_profiles_active"
  ON public.profiles
  FOR UPDATE
  USING (
    company_id = (auth.jwt() ->> 'company_id')::uuid
    AND (auth.jwt() ->> 'role') IN ('admin', 'gestor')
  )
  WITH CHECK (
    company_id = (auth.jwt() ->> 'company_id')::uuid
  );
```

**Campos da política:** apenas `active` deve ser atualizável pelo frontend. O data layer deve garantir que apenas `active` seja enviado no UPDATE.

### 3.2 Edge Functions

**Novo arquivo:** `supabase/functions/invite-corretor/index.ts`

Responsabilidades exatas (sem pseudocódigo — apenas especificação):

1. Receber `OPTIONS` e responder com `corsHeaders` (preflight)
2. Receber `POST` com body `{ email: string, fullName: string }`
3. Validar presença de `Authorization` header
4. Criar client anon para extrair claims do JWT do caller:
   - `SUPABASE_URL` e `SUPABASE_ANON_KEY` via `Deno.env.get()`
   - `anonClient.auth.getUser(jwt)` onde `jwt` é o Bearer token do header
5. Verificar que `user.app_metadata.role` é `'admin'` ou `'gestor'`
6. Extrair `callerCompanyId` de `user.app_metadata.company_id`
7. Criar adminClient com `SUPABASE_SERVICE_ROLE_KEY` via `Deno.env.get()`
8. Chamar `adminClient.auth.admin.inviteUserByEmail(email, { data: { full_name: fullName, company_id: callerCompanyId, role: 'corretor' } })`
9. Em caso de erro do Supabase: retornar 400 ou 500 com `{ error: string }`
10. Em caso de sucesso: retornar 200 com `{ message: 'Convite enviado com sucesso' }`
11. Emitir log estruturado em toda operação (ver seção 3.7)

**Códigos de erro a retornar:**
- `403` — caller não é admin nem gestor
- `400` — email inválido, fullName ausente, ou usuário já cadastrado na empresa
- `409` — email já existe em auth.users (Supabase retorna erro específico)
- `500` — erro interno da Edge Function

### 3.3 Frontend

**Arquivos novos:**
- `src/lib/corretores.ts` — data layer completo
- `src/routes/_authenticated/corretores.index.tsx` — listagem de corretores
- `src/routes/_authenticated/corretores.convidar.tsx` — formulário de convite

**Arquivo modificado:**
- `src/routes/_authenticated/corretores.tsx` — transformar de stub para layout route com `<Outlet />`

**Arquivo modificado:**
- `src/types/domain.ts` — adicionar `InviteCorretorPayload` interface

**Dependências de UI:** apenas componentes shadcn/ui já instalados. Nenhuma nova dependência de npm necessária.

### 3.4 Supabase (config e deploy)

**`supabase/config.toml`** — nenhuma alteração necessária. `verify_jwt = true` já está configurado e se aplica a todas as Edge Functions, incluindo a nova.

**Deploy:** `supabase functions deploy invite-corretor --project-ref uszopnkydweixqgyfynj`

### 3.5 Variáveis de Ambiente

**Edge Function — secrets (nunca em código, nunca commitadas):**

| Secret | Fonte | Comando de configuração |
|--------|-------|------------------------|
| `SUPABASE_URL` | Dashboard → Settings → API | `supabase secrets set SUPABASE_URL=<value>` |
| `SUPABASE_ANON_KEY` | Dashboard → Settings → API | `supabase secrets set SUPABASE_ANON_KEY=<value>` |
| `SUPABASE_SERVICE_ROLE_KEY` | Dashboard → Settings → API → service_role | `supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<value>` |

**Nota:** `SUPABASE_URL` e `SUPABASE_ANON_KEY` podem já estar disponíveis como variáveis de ambiente padrão nas Edge Functions do Supabase. Verificar na Etapa 4.

**Frontend (`.env.local` — já existente, não alterar):**
- `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` já configurados.
- A URL da Edge Function é derivada de `VITE_SUPABASE_URL` + `/functions/v1/invite-corretor` — sem nova variável.

### 3.6 Segurança

**Verificações obrigatórias na Edge Function (em ordem):**

1. **verify_jwt automático** — `config.toml` rejeita requests sem JWT válido antes do código executar. Nenhuma verificação adicional de presença do JWT é necessária no código.
2. **Role check explícito** — mesmo com JWT válido, verificar que `app_metadata.role` é `'admin'` ou `'gestor'`. Um corretor autenticado com JWT válido NÃO deve conseguir convidar outros.
3. **company_id binding** — o `company_id` do convite DEVE vir do JWT do caller, nunca do body da request. O frontend não envia `company_id` no body.
4. **Role do convidado é sempre 'corretor'** — hardcoded na Edge Function. O body da request não controla o role do usuário convidado.
5. **Service role key isolada** — o adminClient é criado apenas dentro da Edge Function. O frontend chama a Edge Function via fetch com JWT do usuário, nunca com service role.
6. **CORS restrito** — o `corsHeaders` atual usa `'Access-Control-Allow-Origin': '*'`. Para produção, restringir ao domínio da aplicação (ver Risco R-04 para discussão).

**Política de UPDATE no banco:**
- `WITH CHECK` garante que o `company_id` do profile atualizado é sempre o mesmo do JWT do caller
- O data layer (`toggleCorretorActive`) envia apenas `{ active: boolean }` no UPDATE — nunca campos sensíveis

### 3.7 Logs

**Formato obrigatório para operações na Edge Function:**

```
{
  module: 'invite-corretor',
  action: 'invite_attempt' | 'permission_denied' | 'invite_success' | 'invite_error',
  callerUserId: string,
  callerRole: string,
  callerCompanyId: string,
  targetEmail: string,           // presente em invite_attempt, invite_success, invite_error
  errorCode?: string,            // presente em permission_denied, invite_error
  durationMs: number,
  timestamp: string              // ISO 8601
}
```

**Instrução:** logar com `console.log(JSON.stringify(log))` — os logs das Edge Functions ficam disponíveis via `supabase functions logs invite-corretor`.

**Logs no data layer frontend (`src/lib/corretores.ts`):**
- Em desenvolvimento (`import.meta.env.DEV`): logar erros DataLayerError com `console.error`
- Em produção: silencioso (o error boundary da rota exibe mensagem ao usuário)

### 3.8 Observabilidade

- Logs estruturados na Edge Function permitem filtrar por `callerCompanyId` para auditar convites por empresa
- A tabela `profiles` com campo `created_at` serve como log de criação de membros
- RLS em `profiles` garante que nenhum dado vaza entre empresas mesmo sem filtros explícitos no frontend
- Futuramente: tabela `audit_logs` (já referenciada em `database.types.ts`) pode registrar eventos de convite

---

## 4. Backlog Técnico

### Épico E-01: Data Layer de Corretores

**User Story US-01:** Como sistema, preciso de um módulo isolado para todas as operações de dados relacionadas a corretores, seguindo os padrões DataLayerError e getAuthContext().

**Task T-01.1: Criar `src/lib/corretores.ts`**
- **Objetivo:** Implementar as 3 funções públicas do data layer de corretores
- **Dependências:** `src/lib/auth.ts`, `src/lib/errors.ts`, `src/lib/database.types.ts`
- **Complexidade:** Baixa
- **Critérios de aceite:**
  - [ ] `listCorretores()` retorna `CorretorListItem[]` usando `getAuthContext()` — sem query em profiles para obter companyId
  - [ ] `toggleCorretorActive(id, active)` atualiza apenas o campo `active` do profile, com verificação de `companyId`
  - [ ] `inviteCorretor(email, fullName)` faz POST para a Edge Function com JWT do usuário no header Authorization
  - [ ] Todos os erros encapsulados em `DataLayerError` com contexto específico
  - [ ] Nenhuma dependência de estado React (módulo puro)
  - [ ] `tsc --noEmit` sem erros após criação

**Subtask ST-01.1.1:** Definir tipo `CorretorListItem` derivado de `Database['public']['Tables']['profiles']['Row']`

**Subtask ST-01.1.2:** Implementar `listCorretores()`

**Subtask ST-01.1.3:** Implementar `toggleCorretorActive(id: string, active: boolean)`

**Subtask ST-01.1.4:** Implementar `inviteCorretor(email: string, fullName: string)`

---

### Épico E-02: Edge Function de Convite

**User Story US-02:** Como administrador, preciso convidar corretores por email de forma segura, garantindo que o corretor seja associado à minha empresa automaticamente.

**Task T-02.1: Criar `supabase/functions/invite-corretor/index.ts`**
- **Objetivo:** Edge Function segura que emite convite via Supabase Auth Admin API
- **Dependências:** Supabase project deployado, secrets configurados, trigger verificado (Etapa 0)
- **Complexidade:** Média
- **Critérios de aceite:**
  - [ ] OPTIONS request retorna 200 com corsHeaders corretos
  - [ ] Request sem JWT retorna 401 (automático via `verify_jwt = true`)
  - [ ] Request com JWT de corretor retorna 403
  - [ ] Request com JWT de admin ou gestor + body válido retorna 200
  - [ ] `company_id` do convite é SEMPRE extraído do JWT, nunca do body
  - [ ] `role` do convidado é SEMPRE `'corretor'`, hardcoded
  - [ ] Email já existente retorna 409 com mensagem clara
  - [ ] Log estruturado emitido em todo outcome (sucesso e erro)
  - [ ] `supabase functions deploy invite-corretor` sem erros

---

### Épico E-03: UI — Gestão de Corretores

**User Story US-03:** Como usuário autenticado, preciso visualizar todos os corretores da minha empresa com Nome, Função e Status.

**Task T-03.1: Transformar `corretores.tsx` em layout route**
- **Objetivo:** Adicionar `<Outlet />` e estrutura de navegação dentro da seção de corretores
- **Dependências:** nenhuma
- **Complexidade:** Baixa
- **Critérios de aceite:**
  - [ ] `corretores.tsx` renderiza header com título + botão "Convidar Corretor" visível apenas para admin/gestor
  - [ ] `<Outlet />` presente para subrotas
  - [ ] Botão "Convidar" navega para `/corretores/convidar`
  - [ ] `pendingComponent` e `errorComponent` presentes no Route config (se tiver loader — neste caso layout sem loader)

**Task T-03.2: Criar `corretores.index.tsx` — listagem**
- **Objetivo:** Listar corretores da empresa com loader TanStack
- **Dependências:** T-01.1 (listCorretores()), T-03.1
- **Complexidade:** Baixa
- **Critérios de aceite:**
  - [ ] `loader: () => listCorretores()` — sem useEffect, sem useState para dados
  - [ ] `pendingComponent` presente
  - [ ] `errorComponent` presente
  - [ ] Tabela exibe: Nome (full_name), Função (role em português), Status (badge Ativo/Inativo)
  - [ ] Toggle de ativo/inativo visível apenas para admin e gestor (verificar via `useAuth()`)
  - [ ] Toggle chama `toggleCorretorActive()` e invalida o loader (via `router.invalidate()`)
  - [ ] Estado vazio exibe mensagem "Nenhum corretor cadastrado" com CTA de convite (se admin/gestor)
  - [ ] Responsivo: funcional em mobile (`grid` ou `table` responsivo)

**Task T-03.3: Criar `corretores.convidar.tsx` — formulário de convite**
- **Objetivo:** Formulário controlado para convite de novo corretor
- **Dependências:** T-01.1 (inviteCorretor()), T-03.1
- **Complexidade:** Baixa
- **Critérios de aceite:**
  - [ ] Acessível apenas por admin e gestor — `beforeLoad` redireciona corretores para `/corretores`
  - [ ] Campos: email (type="email", required) e Nome Completo (type="text", required)
  - [ ] Submit chama `inviteCorretor(email, fullName)`
  - [ ] Estado de loading: botão desabilitado durante o POST
  - [ ] Sucesso: exibe toast/mensagem de confirmação e navega para `/corretores`
  - [ ] Erro: exibe mensagem de erro inline (não redireciona)
  - [ ] Erro 409 (usuário já existe): mensagem específica "Este email já está cadastrado"
  - [ ] Erro 403: não deve ocorrer (beforeLoad já bloqueia), mas tratar com mensagem "Sem permissão"

---

### Épico E-04: Banco de Dados

**User Story US-04:** Como sistema, preciso que o banco de dados suporte a ativação/desativação de corretores por admin e gestor, mantendo RLS correto.

**Task T-04.1: Criar migration `M-05_rls_profiles_update_active.sql`**
- **Objetivo:** Política RLS que permite UPDATE apenas para admin/gestor da mesma empresa
- **Dependências:** Nenhuma
- **Complexidade:** Baixa
- **Critérios de aceite:**
  - [ ] Policy aplicada em profiles para UPDATE
  - [ ] Corretor com JWT válido NÃO consegue atualizar profiles (nem o próprio)
  - [ ] Admin/Gestor de empresa A NÃO consegue atualizar profiles de empresa B
  - [ ] Admin/Gestor da mesma empresa consegue atualizar `active`

**Task T-04.2: Verificar e ajustar trigger `on_auth_user_created` (Etapa 0)**
- **Objetivo:** Garantir que o trigger lê `raw_user_meta_data.company_id` corretamente
- **Dependências:** Nenhuma
- **Complexidade:** Média (risco de migration em função existente)
- **Critérios de aceite:**
  - [ ] Trigger cria profile com `company_id` vindo de `raw_user_meta_data`
  - [ ] Trigger cria profile com `role` vindo de `raw_user_meta_data` (ou default 'corretor')
  - [ ] `ON CONFLICT (id) DO NOTHING` presente (idempotência)
  - [ ] Fluxo `signUp()` existente não é quebrado pela alteração

---

## 5. Plano de Implementação

### Etapa 0 — Verificar Trigger `on_auth_user_created`

**Objetivo:** Confirmar que o trigger existente é compatível com o fluxo de convite, sem implementar nada ainda.

**Arquivo envolvido:** Nenhum arquivo do frontend. Apenas consulta ao banco de dados.

**Ordem de execução:**
1. Acessar Supabase Dashboard → Database → Functions → buscar `handle_new_user` (ou nome equivalente)
2. Verificar o corpo da função:
   - Lê `NEW.raw_user_meta_data->>'company_id'`?
   - Lê `NEW.raw_user_meta_data->>'role'`?
   - Tem `ON CONFLICT (id) DO NOTHING`?
3. Se SIM para todos: nenhuma migration necessária. Prosseguir para Etapa 1.
4. Se NÃO: criar migration `M-05b_fix_trigger_handle_new_user.sql` com a versão corrigida da função (especificação no Risco R-01).

**Risco desta etapa:** Ver Risco R-01.

**Critério de conclusão:** Confirmação documentada de que o trigger lê `company_id` e `role` de `raw_user_meta_data`, ou migration aplicada e testada.

---

### Etapa 1 — Criar `src/lib/corretores.ts`

**Arquivos envolvidos:**
- `src/lib/corretores.ts` ← criar
- `src/types/domain.ts` ← adicionar `InviteCorretorPayload`

**Dependências anteriores:** Etapa 0 concluída (para saber o contrato do trigger).

**Ordem de execução:**
1. Adicionar em `src/types/domain.ts`:
   ```
   InviteCorretorPayload { email: string; fullName: string }
   ```
2. Criar `src/lib/corretores.ts` com as 3 funções:
   - `listCorretores()` — SELECT profiles com role, active, full_name filtrado por companyId via RLS
   - `toggleCorretorActive(id, active)` — UPDATE profiles SET active WHERE id AND company_id via RLS
   - `inviteCorretor(email, fullName)` — POST para Edge Function com Authorization header

**URL da Edge Function em `inviteCorretor`:**
```
`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invite-corretor`
```
Esta construção é a única forma correta — sem hardcode, derivada da variável de ambiente já existente.

**Riscos desta etapa:** Nenhum significativo. Código puramente frontend.

**Critério de conclusão:** `tsc --noEmit` sem erros. Funções importáveis sem erros de tipo.

---

### Etapa 2 — Criar Edge Function `invite-corretor`

**Arquivos envolvidos:**
- `supabase/functions/invite-corretor/index.ts` ← criar
- `supabase/functions/_shared/cors.ts` ← ler (não alterar)

**Dependências anteriores:** Etapa 0 concluída.

**Ordem de execução:**
1. Criar diretório `supabase/functions/invite-corretor/`
2. Criar `index.ts` com a lógica especificada na seção 3.2

**Ordem interna de execução no handler:**
1. Handle OPTIONS → retornar corsHeaders
2. Extrair JWT do header `Authorization: Bearer <token>`
3. Criar anonClient e verificar caller via `anonClient.auth.getUser(jwt)`
4. Verificar role do caller
5. Criar adminClient com SERVICE_ROLE_KEY
6. Chamar `inviteUserByEmail` com metadados
7. Retornar resposta com `corsHeaders` sempre (inclusive em erros)

**Riscos desta etapa:** Ver Riscos R-02, R-03, R-05.

**Critério de conclusão:** Teste manual com `curl` ou Postman: POST com JWT de admin retorna 200; POST com JWT de corretor retorna 403; POST sem JWT retorna 401.

---

### Etapa 3 — Criar Rotas e UI

**Arquivos envolvidos:**
- `src/routes/_authenticated/corretores.tsx` ← modificar (stub → layout)
- `src/routes/_authenticated/corretores.index.tsx` ← criar
- `src/routes/_authenticated/corretores.convidar.tsx` ← criar

**Dependências anteriores:** Etapa 1 (data layer).

**Ordem de execução:**
1. Modificar `corretores.tsx` para layout route com `<Outlet />`
2. Criar `corretores.index.tsx` com loader e tabela de listagem
3. Criar `corretores.convidar.tsx` com formulário e `beforeLoad` de permissão
4. Executar `npm run generate-routes` para regenerar `routeTree.gen.ts`

**Ordem interna do loader em `corretores.index.tsx`:**
```
loader: () => listCorretores()
```
Sem `pendingComponent` desnecessariamente complexo — usar o padrão mínimo consistente com `dashboard.tsx`.

**`beforeLoad` em `corretores.convidar.tsx`:**
```
beforeLoad: ({ context }) => {
  const role = context.auth?.role
  if (role !== 'admin' && role !== 'gestor') {
    throw redirect({ to: '/_authenticated/corretores' })
  }
}
```
O context.auth deve ser fornecido pelo `_authenticated.tsx` (verificar se já existe o contexto de router com claims — se não, adaptar para ler via hook após load).

**Risco desta etapa:** Ver Risco R-06 (beforeLoad e contexto de auth no router).

**Critério de conclusão:** `tsc --noEmit` sem erros. `npm run generate-routes` sem erros. Rotas visíveis no devtools do TanStack Router.

---

### Etapa 4 — Deploy e Configuração de Secrets

**Arquivos envolvidos:** Nenhum arquivo de código. Operações de CLI.

**Ordem de execução:**
1. Aplicar migration M-05 (RLS UPDATE profiles):
   ```
   supabase db push --project-ref uszopnkydweixqgyfynj
   ```
   ou via Dashboard SQL Editor.

2. Configurar secrets da Edge Function:
   ```
   supabase secrets set SUPABASE_URL=<valor>
   supabase secrets set SUPABASE_ANON_KEY=<valor>
   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<valor> --project-ref uszopnkydweixqgyfynj
   ```

3. Deploy da Edge Function:
   ```
   supabase functions deploy invite-corretor --project-ref uszopnkydweixqgyfynj
   ```

4. Verificar no dashboard: Functions → invite-corretor → Status: Active.

**Riscos desta etapa:** Ver Risco R-03 (service role key).

**Critério de conclusão:** Edge Function aparece como "Active" no dashboard. Teste de smoke: POST para a URL de produção com JWT válido retorna 200 ou 409 (se email já existe).

---

### Etapa 5 — Verificação Final

**Arquivos envolvidos:** Nenhum novo arquivo. Apenas verificações.

**Ordem de execução:**
1. `npx tsc --noEmit` — zero erros
2. `npm run generate-routes` — zero erros
3. `xxd src/routes/_authenticated/corretores.index.tsx | tail -3` — confirmar ausência de null bytes
4. Verificar com `file` command todos os arquivos criados nesta task
5. Teste manual completo (ver Seção 6)
6. Verificar logs da Edge Function: `supabase functions logs invite-corretor`

**Critério de conclusão:** Todos os fluxos da seção 6 testados e passando. `tsc --noEmit` limpo. Nenhum arquivo corrompido.

---

## 6. Plano de Testes

### 6.1 Fluxos Felizes

**FH-01 — Admin convida corretor:**
1. Logar como usuário com role 'admin'
2. Navegar para `/corretores/convidar`
3. Preencher email válido e nome
4. Submeter formulário
5. **Esperado:** Toast de sucesso, redirect para `/corretores`, email enviado ao corretor

**FH-02 — Gestor convida corretor:**
- Idêntico ao FH-01, mas com usuário de role 'gestor'
- **Esperado:** mesmo comportamento

**FH-03 — Corretor aceita convite:**
1. Clicar no link do email de convite
2. Definir senha
3. Fazer login
4. **Esperado:** JWT contém company_id e role 'corretor' corretos. Profile criado em `profiles`.

**FH-04 — Corretor aparece na listagem:**
1. Após FH-03, logar como admin ou gestor
2. Navegar para `/corretores`
3. **Esperado:** Novo corretor aparece com Nome correto, Função 'Corretor', Status 'Ativo'

**FH-05 — Admin desativa corretor:**
1. Na listagem, clicar no toggle de ativo do corretor
2. **Esperado:** Status muda para 'Inativo'. `profiles.active = false` no banco.

**FH-06 — Admin reativa corretor:**
- Idêntico ao FH-05 mas invertendo o estado
- **Esperado:** Status volta para 'Ativo'

### 6.2 Fluxos de Erro

**FE-01 — Corretor tenta acessar `/corretores/convidar`:**
- **Esperado:** `beforeLoad` redireciona para `/corretores`. Formulário nunca renderiza.

**FE-02 — Corretor tenta chamar a Edge Function diretamente (com JWT válido):**
- POST para `/functions/v1/invite-corretor` com JWT de corretor
- **Esperado:** 403 com body `{ error: "Sem permissão. Apenas admin e gestor podem convidar corretores." }`

**FE-03 — Submissão sem JWT (sessão expirada):**
- Forçar expiração de sessão, tentar submeter formulário
- **Esperado:** Edge Function retorna 401 (via `verify_jwt = true`). UI exibe mensagem de erro. Não redireciona para login automaticamente (tratar no error handler do formulário).

**FE-04 — Email inválido:**
- Submeter formulário com email malformado
- **Esperado:** Validação HTML5 (`type="email"`) bloqueia no browser. Edge Function também valida (segunda linha de defesa).

**FE-05 — Nome vazio:**
- Submeter sem preencher nome
- **Esperado:** Validação HTML5 (`required`) bloqueia. Edge Function valida presença de `fullName`.

**FE-06 — Erro de rede:**
- Simular offline e submeter
- **Esperado:** Mensagem de erro inline "Não foi possível enviar o convite. Verifique sua conexão."

### 6.3 Segurança e Permissões

**SP-01 — Cross-company invite (ataque manual):**
- Interceptar o POST para a Edge Function e injetar um `company_id` diferente no body
- **Esperado:** Edge Function ignora `company_id` do body. Usa sempre o do JWT. Corretor é criado na empresa correta do caller.

**SP-02 — RLS UPDATE cross-company:**
- Tentar UPDATE em `profiles.active` de um corretor de outra empresa via Supabase JS direto
- **Esperado:** RLS bloqueia. Zero rows affected. Sem erro explícito (RLS silencioso).

**SP-03 — Listagem cross-company:**
- Tentar SELECT em `profiles` com `company_id` de outra empresa via Supabase JS direto
- **Esperado:** Zero rows retornadas. RLS filtra automaticamente.

**SP-04 — Service role key não exposta:**
- Inspecionar network tab do browser durante o convite
- **Esperado:** Nenhuma requisição contém a service role key. Apenas o JWT do usuário vai no header.

### 6.4 Convite Expirado

**EX-01 — Link de convite expirado (após 24h padrão):**
- Tentar clicar em link de convite expirado
- **Esperado:** Supabase retorna página de erro de link expirado (comportamento padrão Supabase Auth — fora do controle do frontend).
- **Ação:** Documentar para o usuário que o link expira em 24h. O admin deve reenviar o convite manualmente (fora do escopo desta task).

### 6.5 Token Inválido

**TI-01 — JWT adulterado:**
- Enviar request para Edge Function com JWT modificado
- **Esperado:** `verify_jwt = true` rejeita com 401 antes de executar o código.

**TI-02 — JWT de outro projeto Supabase:**
- Enviar request com JWT válido de outro projeto
- **Esperado:** `verify_jwt = true` rejeita com 401 (JWT assinado com secret diferente).

### 6.6 Usuário Já Existente

**UE-01 — Email já cadastrado no projeto:**
- Tentar convidar email que já tem conta em auth.users
- **Esperado:** Edge Function recebe erro do Supabase Auth Admin API. Retorna 409 com `{ error: "Este email já está cadastrado no sistema." }`. UI exibe mensagem específica.

**UE-02 — Email convidado duas vezes:**
- Tentar convidar o mesmo email antes do primeiro convite ser aceito
- **Esperado:** Mesmo tratamento do UE-01 (o primeiro convite já cria o usuário em auth.users com status 'invited').

### 6.7 Empresa Incorreta

**EC-01 — Verificação de isolamento pós-aceite:**
- Corretor de empresa A aceita convite e faz login
- Verificar que o profile criado tem `company_id` da empresa do admin que convidou
- **Esperado:** `profiles.company_id` = companyId do caller. JWT do corretor contém o mesmo company_id após o Custom Access Token Hook rodar.

---

## 7. Checklist de Auditoria

### Banco de Dados
- [ ] **Trigger verificado:** Consultar corpo da função `handle_new_user()` no Dashboard e confirmar que lê `raw_user_meta_data->>'company_id'` e `raw_user_meta_data->>'role'`
- [ ] **Migration M-05 aplicada:** Verificar existência da policy `admin_gestor_can_update_profiles_active` em Database → Policies → profiles
- [ ] **RLS UPDATE testado:** Executar teste SP-02 e confirmar bloqueio cross-company
- [ ] **Coluna active:** Verificar que `profiles.active` é `boolean` e tem default `true`

### Edge Function
- [ ] **Deploy confirmado:** Dashboard → Edge Functions → invite-corretor → Status: Active
- [ ] **Secrets configurados:** `supabase secrets list --project-ref uszopnkydweixqgyfynj` lista as 3 variáveis
- [ ] **verify_jwt ativo:** Testar POST sem Authorization header → confirmar 401
- [ ] **Role check:** Testar POST com JWT de corretor → confirmar 403
- [ ] **company_id do JWT:** Verificar nos logs que o `callerCompanyId` do log vem do JWT, não do body
- [ ] **Logs emitidos:** `supabase functions logs invite-corretor` mostra logs estruturados após teste
- [ ] **CORS OK:** Verificar que requisição do browser não bloqueia por CORS (Network tab → sem CORS error)

### Frontend — Data Layer
- [ ] **`tsc --noEmit` limpo:** Zero erros após criação de `corretores.ts`
- [ ] **Sem hardcode:** Nenhuma URL, ID ou key hardcoded em `corretores.ts` — apenas `import.meta.env.VITE_SUPABASE_URL`
- [ ] **DataLayerError:** Todos os `catch` em `corretores.ts` lançam `new DataLayerError(context, error)`
- [ ] **getAuthContext():** `listCorretores()` e `toggleCorretorActive()` usam `getAuthContext()` — sem query em profiles para companyId
- [ ] **inviteCorretor:** JWT enviado no header `Authorization: Bearer <session.access_token>` — não no body

### Frontend — Rotas
- [ ] **`generate-routes` sem erros:** `npm run generate-routes` passa sem erros
- [ ] **Arquivos íntegros:** `file src/routes/_authenticated/corretores*.tsx` retorna `UTF-8 text` para todos
- [ ] **Null bytes ausentes:** `xxd` nos arquivos criados não mostra `0000` bytes no final
- [ ] **pendingComponent:** `corretores.index.tsx` tem `pendingComponent`
- [ ] **errorComponent:** `corretores.index.tsx` tem `errorComponent`
- [ ] **beforeLoad funcional:** Navegação direta para `/corretores/convidar` por corretor redireciona para `/corretores`
- [ ] **Outlet presente:** `corretores.tsx` renderiza `<Outlet />` corretamente

### Frontend — UI
- [ ] **Listagem exibe:** Nome (full_name), Função (role traduzido), Status (badge Ativo/Inativo)
- [ ] **Email ausente:** Nenhuma coluna de email na listagem
- [ ] **Toggle de ativo/inativo:** Visível apenas para admin e gestor (verificar via `useAuth()`)
- [ ] **Estado vazio:** Listagem vazia exibe mensagem + CTA contextual
- [ ] **Mobile:** Listagem funcionando em viewport 375px (sem overflow horizontal)
- [ ] **Formulário de convite:** Campos email (required) e nome (required) com validação HTML5

### Segurança Final
- [ ] **Network tab:** Nenhuma `service_role` key visível nas requisições do browser
- [ ] **Teste SP-01:** Body com `company_id` forjado → corretor criado na empresa correta do caller
- [ ] **Teste SP-03:** SELECT cross-company via JS direto → zero rows

---

## 8. Riscos Técnicos

### R-01 — Trigger `on_auth_user_created` incompatível com fluxo de convite
**Descrição:** O trigger existente pode ter sido criado apenas para o fluxo `signUp()`, onde `company_id` vem de um contexto diferente (ex: `company_name` em vez de `company_id`). Se o trigger não lê `raw_user_meta_data->>'company_id'`, o profile do corretor convidado será criado sem `company_id`, violando a FK e falhando silenciosamente.

**Probabilidade:** Alta — o trigger foi criado para um fluxo diferente.

**Impacto:** Crítico — corretor não aparece na listagem, não tem acesso à empresa, fluxo completo quebrado.

**Mitigação:** Etapa 0 é obrigatória antes de qualquer outra. Se o trigger precisar de ajuste, a migration `M-05b` deve ser aplicada e testada com um convite real antes de prosseguir para Etapa 2. O corpo correto esperado está documentado na seção 3.1.1.

**Observação adicional:** O `signUp()` atual em `auth.ts` passa `data: { full_name, company_name }` — sem `company_id`. Isso sugere que o trigger atual pode não ler `company_id` do meta. **Altamente provável que seja necessária a migration.**

---

### R-02 — Email de convite indo para spam
**Descrição:** O email de convite do Supabase Auth pode ser classificado como spam por provedores como Gmail, Outlook ou servidores corporativos, especialmente em contas recém-criadas ou sem domínio personalizado.

**Probabilidade:** Média — comum em ambientes de desenvolvimento/staging com domínio Supabase padrão.

**Impacto:** Médio — corretor não recebe o convite, UX degradada.

**Mitigação:** 
- Configurar domínio de email customizado no Supabase (Settings → Auth → SMTP)
- Informar ao usuário que o email pode estar na pasta de spam
- Fora do escopo desta task: implementar reenvio de convite (future task)

---

### R-03 — Service role key exposta acidentalmente
**Descrição:** A `SUPABASE_SERVICE_ROLE_KEY` pode ser acidentalmente commitada em código, logada nos logs da Edge Function, ou exposta em respostas de erro.

**Probabilidade:** Baixa — com disciplina de código, mas o risco existe.

**Impacto:** Crítico — service role key ignora RLS, dá acesso admin ao banco inteiro.

**Mitigação:**
- A key NUNCA aparece em código — somente via `Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')`
- `.gitignore` deve incluir `.env` e `.env.local` (já deve estar configurado)
- Os logs estruturados da Edge Function NUNCA incluem a service role key — apenas companyId, userId e email do alvo
- Checklist SP-04 valida isso antes do merge

---

### R-04 — Corretor convidado para empresa errada
**Descrição:** Se a Edge Function usar qualquer valor do body para determinar o `company_id` do convite (ao invés do JWT), um caller malicioso poderia convidar corretores para empresas de terceiros.

**Probabilidade:** Baixa — se implementado conforme especificação (company_id vem do JWT).

**Impacto:** Crítico — violação de multi-tenancy, dado de empresa errada exposto ao corretor.

**Mitigação:**
- Especificação é explícita: `callerCompanyId` SEMPRE extraído de `user.app_metadata.company_id` via `anonClient.auth.getUser(jwt)`
- Body da request contém APENAS `email` e `fullName` — sem `company_id`
- Teste SP-01 valida isso no checklist de auditoria

---

### R-05 — Edge Function com timeout em produção
**Descrição:** A chamada `auth.admin.inviteUserByEmail()` pode levar mais tempo que o esperado em produção (envio de email, latência), causando timeout na Edge Function (limite padrão: 10s em Edge Functions gratuitas do Supabase).

**Probabilidade:** Baixa — a operação típica é rápida (~1-3s).

**Impacto:** Médio — usuário vê erro "timeout" mas o convite pode ter sido enviado.

**Mitigação:**
- Monitorar `durationMs` nos logs para identificar operações lentas
- O frontend deve tratar timeout com mensagem específica: "O convite pode ter sido enviado. Verifique a listagem em alguns minutos."
- Fora do escopo: implementar idempotência (verificar se usuário já existe antes de tentar o convite)

---

### R-06 — `beforeLoad` e contexto de auth no TanStack Router
**Descrição:** A implementação de `beforeLoad` para verificar o role do usuário exige que o contexto de autenticação esteja disponível no router context. Se o `_authenticated.tsx` não passa claims para o router context, o `beforeLoad` em `corretores.convidar.tsx` não terá acesso ao role.

**Probabilidade:** Média — depende da implementação atual de `_authenticated.tsx`.

**Impacto:** Médio — sem o `beforeLoad`, a proteção da rota fica apenas na UI (não impede acesso direto pela URL).

**Mitigação:**
- Verificar o estado atual de `_authenticated.tsx` e como ele expõe claims ao router context
- Se `context.auth` não existe: alternativa é usar `loader` em `corretores.convidar.tsx` com verificação de role, lançando `redirect()` se não autorizado (mais verboso mas igualmente seguro)
- Outra alternativa: verificar role no `component` via `useAuth()` e exibir tela de "Acesso negado" em vez de redirect

---

### R-07 — CORS em produção com `Access-Control-Allow-Origin: *`
**Descrição:** O `corsHeaders` atual usa wildcard `'*'`. Em produção, isso permite que qualquer site faça requisições para a Edge Function com um JWT válido (se obtido de alguma forma).

**Probabilidade:** Baixa — exploração requer JWT válido.

**Impacto:** Baixo — a proteção real é o JWT + role check, não o CORS.

**Decisão:** Aceitar para o Sprint 2. Restringir o CORS ao domínio de produção é uma melhoria de hardening para sprint futuro.

---

## 9. Compatibilidade com a norma-lib

### 9.1 Módulo `norma-team-management`

**Responsabilidade:** Gerenciar o ciclo de vida completo de membros de uma equipe num sistema multi-tenant: convite por email, listagem, ativação e desativação. O módulo não gerencia autenticação (delegada ao norma-auth) nem permissões granulares (delegadas à camada de RLS do banco).

**Interface Pública do Módulo:**

```typescript
// norma-team-management/index.ts

export interface TeamMember {
  id: string
  displayName: string         // full_name no IMOBIIA
  role: string                // valor do enum de role do domínio
  active: boolean
}

export interface TeamManagementConfig {
  supabaseUrl: string
  edgeFunctionName: string     // 'invite-corretor' no IMOBIIA, 'invite-membro' em outro domínio
  membersTable: string         // 'profiles' no IMOBIIA, 'membros' em outro domínio
  displayNameColumn: string    // 'full_name' no IMOBIIA, 'nome' em outro domínio
  roleColumn: string           // 'role' no IMOBIIA
  roleOptions: string[]        // ['corretor', 'gestor', 'admin'] no IMOBIIA
  inviteRole: string           // role padrão para convidados: 'corretor' no IMOBIIA
  authorizedRoles: string[]    // quem pode convidar: ['admin', 'gestor'] no IMOBIIA
}

export function createTeamManagement(config: TeamManagementConfig) {
  return {
    listMembers: () => Promise<TeamMember[]>
    inviteMember: (email: string, displayName: string) => Promise<void>
    toggleMemberActive: (id: string, active: boolean) => Promise<void>
  }
}
```

**Dependências do módulo:**
- `norma-auth` (para `getAuthContext()` e leitura de JWT)
- `norma-errors` (para `DataLayerError`)
- Supabase JS Client
- Edge Function compatível com o protocolo de convite (recebe `{ email, fullName }`, retorna `{ message }` ou `{ error }`)

**Como reutilizar em outros domínios:**

| Domínio | `edgeFunctionName` | `membersTable` | `inviteRole` | `authorizedRoles` |
|---------|-------------------|----------------|--------------|-------------------|
| IMOBIIA | `invite-corretor` | `profiles` | `corretor` | `['admin', 'gestor']` |
| Advocacia | `invite-advogado` | `membros` | `advogado` | `['socio', 'admin']` |
| Clínicas | `invite-medico` | `equipe` | `medico` | `['diretor', 'gestor']` |
| Educação | `invite-professor` | `corpo_docente` | `professor` | `['diretor', 'coordenador']` |

**O que é específico do domínio (configurável):**
- Nome da Edge Function
- Nome da tabela de membros
- Enum de roles (nomes e valores)
- Role padrão para convidados
- Quem pode convidar (authorized roles)
- Label "Corretor" vs "Médico" vs "Professor" na UI

**O que é genérico (invariante entre domínios):**
- Protocolo de convite: JWT no header + `{ email, fullName }` no body
- Verificação de role na Edge Function
- Extração de `company_id` do JWT (nunca do body)
- Criação automática de profile via trigger no banco
- Padrão DataLayerError
- Padrão de ativação/desativação
- Estrutura de rotas: layout → index (listagem) → convidar (formulário)

### 9.2 Confirmação de Conformidade Arquitetural

A arquitetura da Task 2.1.2 satisfaz todos os critérios do padrão norma-lib:

| Critério | Status | Evidência |
|----------|--------|-----------|
| Desacoplado | ✅ | `inviteRole` e `authorizedRoles` são parâmetros de configuração, não constantes |
| Reutilizável | ✅ | Interface `createTeamManagement(config)` funciona para qualquer domínio |
| Zero hardcode | ✅ | URL da Edge Function derivada de `VITE_SUPABASE_URL`. Nome da função é configurável. |
| Configurável por domínio | ✅ | `TeamManagementConfig` externaliza todos os valores domínio-específicos |
| Preparado para documentação | ✅ | Interface pública documentada nesta seção é suficiente para uso sem leitura do código do IMOBIIA |
| Sem decisões de segurança abertas | ✅ | Role check, company_id binding e service role isolation são todos especificados sem ambiguidade |

---

## Apêndice A — Tipo `CorretorListItem` (referência para Etapa 1)

Derivado de `Database['public']['Tables']['profiles']['Row']`:

```typescript
// Em src/lib/corretores.ts
import type { Database } from './database.types'

type ProfileRow = Database['public']['Tables']['profiles']['Row']

export type CorretorListItem = Pick<ProfileRow, 'id' | 'full_name' | 'role' | 'active'>
```

---

## Apêndice B — Labels de Role para UI

```typescript
// Em src/lib/corretores.ts ou src/lib/utils.ts
export const ROLE_LABELS: Record<string, string> = {
  corretor: 'Corretor',
  gestor: 'Gestor',
  admin: 'Administrador',
}
```

Não hardcodar diretamente nos componentes JSX — importar deste mapa.

---

## Apêndice C — Estrutura de Arquivos Final da Task 2.1.2

```
imobiia-frontend-v2/
├── supabase/
│   ├── config.toml                        (sem alteração)
│   ├── functions/
│   │   ├── _shared/
│   │   │   └── cors.ts                    (sem alteração)
│   │   └── invite-corretor/
│   │       └── index.ts                   ← NOVO
│   └── migrations/
│       ├── M-05_rls_profiles_update_active.sql   ← NOVO
│       └── M-05b_fix_trigger_handle_new_user.sql ← NOVO SE NECESSÁRIO (Etapa 0)
├── src/
│   ├── lib/
│   │   └── corretores.ts                  ← NOVO
│   ├── types/
│   │   └── domain.ts                      ← MODIFICADO (adicionar InviteCorretorPayload)
│   └── routes/
│       └── _authenticated/
│           ├── corretores.tsx             ← MODIFICADO (stub → layout route)
│           ├── corretores.index.tsx       ← NOVO
│           └── corretores.convidar.tsx    ← NOVO
```

---

*Documento gerado em 2026-06-29. Este documento é a fonte de verdade para implementação da Task 2.1.2 e deve ser referenciado pelo Claude Code durante toda a execução.*
