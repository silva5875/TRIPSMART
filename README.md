# TripSmart

Planejador de viagens para Pernambuco. O usuário passa por um wizard (orçamento → mês →
transporte → cidade → hospedagem → transporte local) e recebe um roteiro dia a dia gerado
por IA, que pode salvar no histórico, exportar em PDF e compartilhar com a comunidade.

## Stack

- **Vite + React 18 + TypeScript**
- **Tailwind CSS + shadcn/ui** para a interface
- **Supabase** para autenticação, banco (Postgres com RLS) e edge functions
- **React Query** para estado de servidor
- **n8n** (via edge function `n8n-webhook`) para buscar atrações/hospedagens e gerar o roteiro

## Rodando localmente

Requer Node.js LTS.

```sh
npm install
cp .env.example .env   # preencha com os dados do seu projeto Supabase
npm run dev            # http://localhost:8080
```

## Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run typecheck` | Checagem de tipos, sem emitir |
| `npm run lint` | ESLint |
| `npm test` | Testes (Vitest) |

## Arquitetura

O invariante principal: **todo acesso ao banco mora em `src/data/`**. Componentes consomem
hooks de lá e nunca importam o client do Supabase direto — há uma regra de ESLint
(`no-restricted-imports`) que quebra o lint se alguém furar essa camada. As exceções são
`AuthContext` e `ResetPassword`, que usam apenas `supabase.auth` (sessão e senha), nunca tabelas.

```
src/
  data/          acesso ao banco + hooks de React Query (uma entidade por arquivo)
  components/    UI; os Step* formam o wizard
  pages/         rotas
  lib/           utilitários puros (formatação, PDF)
  hooks/         hooks genéricos
  integrations/  client do Supabase e tipos do banco
supabase/
  migrations/    schema, aplicado em ordem cronológica
  functions/     edge functions
  scripts/       SQL auxiliar, só leitura
```

`src/integrations/supabase/types.ts` é gerado pelo Supabase. As tabelas criadas depois da
última geração ficam em `database.ts`, que estende o tipo sem editar o arquivo gerado —
ao regenerar os tipos, esse arquivo pode ser removido.

## Banco de dados

As migrations em `supabase/migrations/` são aplicadas em ordem cronológica pelo painel do
Supabase. A de `20260915120000` normaliza `city_id` e **remove linhas duplicadas**: rode antes
`supabase/scripts/preview_city_id_dedup.sql`, que só lê e mostra quantas avaliações seriam
fundidas.

Preferências de viagem (`user_preferences`) são **derivadas** do histórico e das avaliações do
usuário pela função `refresh_my_preferences()`, não preenchidas em formulário.

## Autenticação

Email/senha e Google, ambos pelo Supabase. O client usa `flowType: 'pkce'` por necessidade,
não preferência: o app usa `HashRouter`, e o fluxo implícito devolveria o token no hash —
exatamente onde ficam as rotas.

Para o login com Google funcionar é preciso, no painel do Supabase: habilitar o provider Google
com as credenciais do Google Cloud (cujo *redirect URI* é `https://<project-ref>.supabase.co/auth/v1/callback`)
e incluir a origem da aplicação em Authentication → URL Configuration → Redirect URLs.
