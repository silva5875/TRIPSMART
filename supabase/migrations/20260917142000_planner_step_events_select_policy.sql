-- Causa raiz de verdade do 42501 em planner_step_events (a correção anterior,
-- 20260917141000, recriou a política de INSERT à toa — ela já estava certa).
--
-- Confirmado testando ao vivo: um INSERT simples nesta tabela funciona (201).
-- O MESMO insert com `ON CONFLICT (user_id, step) DO NOTHING` — exatamente o
-- que `useRecordPlannerStepEvent` manda via `.upsert(..., {ignoreDuplicates:
-- true})` — falha com "row-level security policy", mesmo inserindo a
-- própria linha. Resolver um ON CONFLICT exige que o Postgres consiga LER a
-- linha que já existe (pra saber que é um conflito), e isso é regido pela
-- política de SELECT — que esta tabela nunca teve, de propósito ("ninguém
-- precisa ler isto de volta").
--
-- `planner_progress` nunca teve esse problema por acidente: a política dela
-- é `FOR ALL`, que já inclui SELECT.

CREATE POLICY "Users can read own step events"
  ON public.planner_step_events FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
