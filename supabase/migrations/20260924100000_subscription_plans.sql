-- Base de assinaturas — sem gateway de pagamento ainda, só a estrutura.
--
-- Três planos (Free, Mochileiro, Explorador), diferenciados pela quantidade
-- de roteiros personalizados por mês. `plans` é catálogo único: tanto a
-- página de preços quanto a checagem de cota leem daqui, para preço e limite
-- nunca ficarem descritos em dois lugares.

CREATE TABLE public.plans (
  id text PRIMARY KEY,
  name text NOT NULL,
  price_cents integer NOT NULL,
  itinerary_limit_per_month integer NOT NULL,
  tagline text,
  display_order smallint NOT NULL,
  is_active boolean NOT NULL DEFAULT true
);

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

-- Lista de preços é pública de propósito — converte visitante deslogado.
CREATE POLICY "Qualquer um vê os planos ativos"
  ON public.plans FOR SELECT
  USING (is_active = true);

INSERT INTO public.plans (id, name, price_cents, itinerary_limit_per_month, tagline, display_order) VALUES
  ('free', 'Free', 0, 1, 'Para experimentar sua primeira viagem', 1),
  ('mochileiro', 'Mochileiro', 990, 5, 'Para planejar uma viagem de verdade, com variações', 2),
  ('explorador', 'Explorador', 2490, 30, 'Para quem planeja com frequência', 3);

-- `profiles` já é legível por qualquer autenticado (ver migration de
-- dtnascimento sobre por que birth_date saiu de lá) — plano não é dado
-- sensível, tudo bem viver aqui.
ALTER TABLE public.profiles
  ADD COLUMN plan_id text NOT NULL DEFAULT 'free' REFERENCES public.plans(id);

-- ============================================================
-- Captura de interesse nos planos pagos. Sem gateway de pagamento ainda, o
-- botão "quero esse plano" grava aqui em vez de fingir cobrar — dá pra medir
-- demanda real antes de integrar pagamento de verdade, e o admin vê quem
-- demonstrou interesse pra fazer o upgrade manual (ex: depois de um PIX
-- combinado por fora).
-- ============================================================
CREATE TABLE public.plan_interest (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  plan_id text NOT NULL REFERENCES public.plans(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.plan_interest ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuário registra o próprio interesse"
  ON public.plan_interest FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuário vê o próprio interesse"
  ON public.plan_interest FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

-- ============================================================
-- Cota do próprio usuário. Sem parâmetro — usa auth.uid() internamente,
-- como todo RPC deste projeto que devolve dado do próprio chamador — não dá
-- pra um usuário consultar a cota de outro. `used_this_month` conta
-- travel_history com a mesma lógica já usada em roteiros_gerados
-- (migration 20260917161000): uma linha por roteiro que a pessoa de fato
-- começou (o botão "Regenerar" da tela de resumo não grava outra linha,
-- então não conta duas vezes — de propósito, mede "roteiros novos", não
-- "chamadas de IA").
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_my_itinerary_quota()
RETURNS TABLE (
  plan_id text,
  plan_name text,
  limit_per_month integer,
  used_this_month integer,
  remaining integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan_id text;
  v_plan_name text;
  v_limit integer;
  v_used integer;
BEGIN
  SELECT p.id, p.name, p.itinerary_limit_per_month
  INTO v_plan_id, v_plan_name, v_limit
  FROM public.profiles pr
  JOIN public.plans p ON p.id = pr.plan_id
  WHERE pr.id = auth.uid();

  IF v_plan_id IS NULL THEN
    RAISE EXCEPTION 'perfil não encontrado';
  END IF;

  SELECT count(*) INTO v_used
  FROM public.travel_history th
  WHERE th.user_id = auth.uid()
    AND th.deleted_at IS NULL
    AND th.created_at >= date_trunc('month', now());

  RETURN QUERY SELECT v_plan_id, v_plan_name, v_limit, v_used, GREATEST(v_limit - v_used, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_itinerary_quota() TO authenticated;

-- ============================================================
-- Admin muda o plano de um usuário — enquanto não existe pagamento
-- automático, é assim que alguém de fato vira Mochileiro/Explorador.
-- Mesmo padrão de admin_set_user_banned.
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_set_user_plan(target_user_id uuid, new_plan_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  UPDATE public.profiles
  SET plan_id = new_plan_id
  WHERE id = target_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_set_user_plan(uuid, text) TO authenticated;

-- ============================================================
-- admin_list_users() ganha plan_id, para a aba Usuários mostrar e trocar o
-- plano de cada um. Mesmo padrão já usado para acrescentar user_number nela.
-- ============================================================
DROP FUNCTION IF EXISTS public.admin_list_users();

CREATE FUNCTION public.admin_list_users()
RETURNS TABLE (
  id              UUID,
  user_number     BIGINT,
  email           TEXT,
  display_name    TEXT,
  avatar_url      TEXT,
  created_at      TIMESTAMPTZ,
  last_sign_in_at TIMESTAMPTZ,
  banned_until    TIMESTAMPTZ,
  roles           public.app_role[],
  trips_count     BIGINT,
  shared_count    BIGINT,
  birth_date      DATE,
  age_years       INT,
  age_months      INT,
  age_days        INT,
  plan_id         TEXT
)
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
    u.id,
    us.id AS user_number,
    u.email::text,
    p.display_name,
    p.avatar_url,
    u.created_at,
    u.last_sign_in_at,
    u.banned_until,
    COALESCE(
      (SELECT array_agg(ur.role) FROM public.user_roles ur WHERE ur.user_id = u.id),
      ARRAY[]::public.app_role[]
    ) AS roles,
    (SELECT count(*) FROM public.travel_history th WHERE th.user_id = u.id AND th.deleted_at IS NULL) AS trips_count,
    (SELECT count(*) FROM public.shared_itineraries si WHERE si.user_id = u.id AND si.deleted_at IS NULL) AS shared_count,
    d.birth_date,
    EXTRACT(YEAR FROM age(CURRENT_DATE, d.birth_date))::int AS age_years,
    EXTRACT(MONTH FROM age(CURRENT_DATE, d.birth_date))::int AS age_months,
    EXTRACT(DAY FROM age(CURRENT_DATE, d.birth_date))::int AS age_days,
    p.plan_id
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  LEFT JOIN public.dtnascimento d ON d.user_id = u.id
  LEFT JOIN public.user_registry us ON us.user_id = u.id
  ORDER BY u.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_list_users() TO authenticated;
