-- Corrige a política de INSERT de page_views.
--
-- A versão anterior (`TO anon, authenticated`) foi testada direto contra o
-- projeto em produção e rejeitada com "new row violates row-level security
-- policy" para uma requisição sem sessão (exatamente o caso de uso central
-- desta tabela: visitante não logado). O motivo mais provável é este projeto
-- usar o novo esquema de chaves do Supabase (publishable/secret, em vez do
-- JWT clássico), onde a requisição anônima aparentemente não resolve para o
-- role `anon` do jeito que as políticas das outras tabelas deste app
-- assumiam.
--
-- A correção é trocar o alvo para `public`, que vale para qualquer role sem
-- depender de como este projeto resolve internamente o papel do visitante —
-- resultado idêntico ao pretendido (inserir é livre; ler continua só por
-- função de admin), só que sem essa dependência frágil.

DROP POLICY IF EXISTS "Anyone can record a page view" ON public.page_views;

CREATE POLICY "Anyone can record a page view"
  ON public.page_views FOR INSERT TO public
  WITH CHECK (true);
