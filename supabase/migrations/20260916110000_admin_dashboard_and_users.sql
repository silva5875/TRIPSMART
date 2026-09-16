-- Painel administrativo: visão geral do site, gestão de usuários,
-- concessão/revogação de admin e inativação de conta.
--
-- Todas as funções abaixo são SECURITY DEFINER porque precisam ler/escrever
-- em auth.users — schema que o usuário autenticado comum não acessa. Cada uma
-- reexecuta a checagem `is_admin()` internamente: nenhuma delas é segura só
-- por estar atrás do botão de admin na tela, a permissão real é aqui.

-- ============================================================
-- 1. LISTAR USUÁRIOS (perfil + auth + papéis + contadores)
-- ============================================================

CREATE OR REPLACE FUNCTION public.admin_list_users()
RETURNS TABLE (
  id               UUID,
  email            TEXT,
  display_name     TEXT,
  avatar_url       TEXT,
  created_at       TIMESTAMPTZ,
  last_sign_in_at  TIMESTAMPTZ,
  banned_until     TIMESTAMPTZ,
  roles            public.app_role[],
  trips_count      BIGINT,
  shared_count     BIGINT
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
    (SELECT count(*) FROM public.shared_itineraries si WHERE si.user_id = u.id AND si.deleted_at IS NULL) AS shared_count
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  ORDER BY u.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_list_users() TO authenticated;

-- ============================================================
-- 2. CONCEDER / REVOGAR PAPEL
-- ============================================================
--
-- Protege contra o único jeito de o painel travar sozinho: remover o último
-- admin restante. Sem essa checagem, ninguém mais conseguiria conceder papéis
-- de volta.

CREATE OR REPLACE FUNCTION public.admin_set_role(
  target_user_id UUID,
  role_to_set public.app_role,
  should_grant BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  remaining_admins INT;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  IF should_grant THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (target_user_id, role_to_set)
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    IF role_to_set = 'admin' THEN
      SELECT count(*) INTO remaining_admins
      FROM public.user_roles
      WHERE role = 'admin' AND user_id <> target_user_id;

      IF remaining_admins = 0 THEN
        RAISE EXCEPTION 'cannot remove the last administrator';
      END IF;
    END IF;

    DELETE FROM public.user_roles WHERE user_id = target_user_id AND role = role_to_set;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_set_role(UUID, public.app_role, BOOLEAN) TO authenticated;

-- ============================================================
-- 3. INATIVAR / REATIVAR USUÁRIO
-- ============================================================
--
-- Bloqueio real via auth.users.banned_until, não uma sinalização de app: a
-- pessoa deixa de conseguir criar sessão nova, por senha ou Google, até
-- reativar. `now() + 100 years` é como o próprio painel do Supabase implementa
-- "banir indefinidamente" — não existe um valor "infinito" no tipo.
--
-- Autobloqueio proibido: um admin não consegue inativar a própria conta e
-- ficar trancado para fora.

CREATE OR REPLACE FUNCTION public.admin_set_user_banned(target_user_id UUID, banned BOOLEAN)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  IF banned AND target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'you cannot deactivate your own account';
  END IF;

  UPDATE auth.users
  SET banned_until = CASE WHEN banned THEN (now() + interval '100 years') ELSE NULL END
  WHERE id = target_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_set_user_banned(UUID, BOOLEAN) TO authenticated;

-- ============================================================
-- 4. VISÃO GERAL — CONTADORES
-- ============================================================

CREATE OR REPLACE FUNCTION public.admin_overview_counts()
RETURNS TABLE (
  total_users              BIGINT,
  total_trips              BIGINT,
  total_shared_itineraries BIGINT,
  total_comments           BIGINT,
  total_likes              BIGINT,
  total_reviews            BIGINT,
  new_users_7d             BIGINT,
  new_users_30d            BIGINT
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
    (SELECT count(*) FROM auth.users),
    (SELECT count(*) FROM public.travel_history WHERE deleted_at IS NULL),
    (SELECT count(*) FROM public.shared_itineraries WHERE deleted_at IS NULL),
    (SELECT count(*) FROM public.itinerary_comments WHERE deleted_at IS NULL),
    (SELECT count(*) FROM public.itinerary_likes),
    (SELECT count(*) FROM public.activity_reviews) + (SELECT count(*) FROM public.accommodation_reviews),
    (SELECT count(*) FROM auth.users WHERE created_at >= now() - interval '7 days'),
    (SELECT count(*) FROM auth.users WHERE created_at >= now() - interval '30 days');
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_overview_counts() TO authenticated;

-- ============================================================
-- 5. VISÃO GERAL — SÉRIE DIÁRIA (para o gráfico)
-- ============================================================
--
-- "Fluxo de pessoas no site" aqui é atividade real já registrada (cadastros,
-- viagens salvas, roteiros compartilhados por dia) — não pageviews de
-- visitante anônimo, que o app não rastreia hoje. Ver observação na entrega.

CREATE OR REPLACE FUNCTION public.admin_activity_series(days_back INT DEFAULT 30)
RETURNS TABLE (day DATE, signups BIGINT, trips BIGINT, shared BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  RETURN QUERY
  WITH days AS (
    SELECT generate_series(current_date - (days_back - 1), current_date, interval '1 day')::date AS day
  )
  SELECT
    d.day,
    COALESCE((SELECT count(*) FROM auth.users u WHERE u.created_at::date = d.day), 0),
    COALESCE((SELECT count(*) FROM public.travel_history th WHERE th.created_at::date = d.day AND th.deleted_at IS NULL), 0),
    COALESCE((SELECT count(*) FROM public.shared_itineraries si WHERE si.created_at::date = d.day AND si.deleted_at IS NULL), 0)
  FROM days d
  ORDER BY d.day;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_activity_series(INT) TO authenticated;
