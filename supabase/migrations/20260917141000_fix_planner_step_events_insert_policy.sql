-- Corrige a política de INSERT de planner_step_events.
--
-- Testado direto contra o projeto em produção: um usuário LOGADO inserindo
-- a PRÓPRIA linha (user_id = auth.uid(), exatamente o que WITH CHECK exige)
-- foi rejeitado com "new row violates row-level security policy" — mesmo
-- token, mesmo request, funcionando sem problema no INSERT equivalente em
-- planner_progress (migration 20260917120000). Não é o mesmo mistério de
-- 20260916130000 (aquele era sobre o role `anon`; aqui o usuário está
-- autenticado) — a causa mais provável é a CREATE POLICY original da
-- migration 20260917140000 não ter sido de fato aplicada.
--
-- Em vez de tentar diagnosticar à distância, recria a política do zero.

DROP POLICY IF EXISTS "Users record own step events" ON public.planner_step_events;

CREATE POLICY "Users record own step events"
  ON public.planner_step_events FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
