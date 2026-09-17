-- CORREÇÃO DE SEGURANÇA — urgente.
--
-- Testado direto contra o projeto em produção: `user_sequence` estava
-- legível por QUALQUER UM, sem nem precisar estar logado — só com a chave
-- publicável, que fica no bundle do navegador. Email, data de nascimento,
-- se a conta está desativada, tudo isso vazando.
--
-- Causa: uma VIEW executa com o privilégio de quem a CRIOU para acessar as
-- tabelas por trás dela — por isso ela lia auth.users/profiles/dtnascimento
-- sem passar pelo RLS dessas tabelas. E o projeto tem um privilégio padrão
-- de SELECT em novas tabelas/views para anon/authenticated (a razão de
-- várias tabelas deste app funcionarem só com RLS, sem GRANT explícito) —
-- que uma view não tem como recusar sozinha, já que ela não tem RLS
-- própria. A intenção original ("view só pro SQL Editor, sem rota nova pro
-- app") nunca chegou a valer na prática.
--
-- Correção: revogar explicitamente. Sem SELECT nenhum para os papéis que o
-- PostgREST usa (anon, authenticated) — só quem já é owner/service_role do
-- banco (SQL Editor, é para isso que a view existe) continua enxergando.

REVOKE ALL ON public.user_sequence FROM anon, authenticated, public;
REVOKE ALL ON public.user_registry FROM anon, authenticated, public;
