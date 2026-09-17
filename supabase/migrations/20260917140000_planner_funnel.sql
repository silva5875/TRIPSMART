-- Funil de abandono do assistente de planejamento.
--
-- `planner_progress` (migration 20260917120000) não serve de base pra isto:
-- ela é sobrescrita a cada etapa e APAGADA quando a viagem é concluída ou
-- reiniciada — ótima para "retomar de onde parei", inútil para "quantas
-- pessoas já chegaram em cada etapa alguma vez". Este log é o oposto: nunca
-- apaga nada.
--
-- Granularidade por USUÁRIO, não por tentativa: se a mesma pessoa planeja
-- duas viagens em momentos diferentes, a segunda vez que ela alcança
-- "budget" não conta de novo. A pergunta que este funil responde é "quantas
-- pessoas distintas já chegaram em cada etapa", não "quantas vezes".

CREATE TABLE public.planner_step_events (
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  step             TEXT NOT NULL,
  first_reached_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, step)
);

ALTER TABLE public.planner_step_events ENABLE ROW LEVEL SECURITY;

-- Sem política de SELECT para o próprio usuário: ninguém no app precisa ler
-- isto de volta, só o admin, e só através das funções abaixo.
CREATE POLICY "Users record own step events"
  ON public.planner_step_events FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_planner_step_events_step ON public.planner_step_events (step);

-- ============================================================
-- Funções administrativas
-- ============================================================
--
-- `step_order` não vem de nenhuma coluna — a ordem das etapas é a mesma
-- sequência fixa de PlannerStepName (src/data/plannerProgress/index.ts) — se
-- aquela lista de etapas mudar um dia, este CASE precisa acompanhar.

CREATE OR REPLACE FUNCTION public.admin_planner_funnel()
RETURNS TABLE (step TEXT, step_order INT, users_reached BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  RETURN QUERY
  SELECT
    e.step,
    CASE e.step
      WHEN 'budget' THEN 1
      WHEN 'month' THEN 2
      WHEN 'transport-arrival' THEN 3
      WHEN 'city' THEN 4
      WHEN 'accommodation' THEN 5
      WHEN 'local-transport' THEN 6
      WHEN 'summary' THEN 7
      ELSE 99
    END AS step_order,
    count(DISTINCT e.user_id) AS users_reached
  FROM public.planner_step_events e
  GROUP BY e.step
  ORDER BY step_order;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_planner_funnel() TO authenticated;

-- Detalhe por trás de "travados agora": quem está em planner_progress neste
-- exato momento (nunca inclui 'summary' — o Planner apaga a linha ao chegar
-- lá) e em qual etapa. A tela agrupa por etapa para o cartão de contagem e
-- filtra por etapa para o "ver quem" de cada uma.
CREATE OR REPLACE FUNCTION public.admin_planner_progress_detail()
RETURNS TABLE (user_id UUID, step TEXT, updated_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  RETURN QUERY
  SELECT p.user_id, p.step, p.updated_at
  FROM public.planner_progress p
  ORDER BY p.updated_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_planner_progress_detail() TO authenticated;
