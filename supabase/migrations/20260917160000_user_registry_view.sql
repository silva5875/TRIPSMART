-- `user_sequence` (migration 20260917150000) era só a ponte id↔user_id.
-- Agora "SELECT * FROM user_sequence" deve devolver a pessoa inteira numa
-- linha só — nome, nascimento, email, quando foi desativada (se foi),
-- quantos logins já fez e a data do último. Uma tabela e uma view não podem
-- ter o mesmo nome, então a tabela original vira `user_registry` (guarda o
-- que só existe aqui: o número sequencial, a contagem de login, a data de
-- desativação) e `user_sequence` passa a ser a VIEW de leitura.
--
-- De propósito sem GRANT para `authenticated`/`anon`: como a view lê
-- auth.users direto (email, last_sign_in_at), ela só deve ser consultada por
-- quem já tem acesso a esse schema — o dono do projeto, pelo SQL Editor.
-- Não é uma rota nova de leitura para o app: o cliente publishable continua
-- sem enxergar nada disto, do mesmo jeito que nunca enxergou a tabela.

ALTER TABLE public.user_sequence RENAME TO user_registry;

ALTER TABLE public.user_registry
  ADD COLUMN IF NOT EXISTS login_count BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMP WITH TIME ZONE;

-- ============================================================
-- Ajusta as duas funções que já apontavam para o nome antigo da tabela.
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  meta_birth_date DATE;
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  );

  INSERT INTO public.user_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.user_registry (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  BEGIN
    meta_birth_date := (NEW.raw_user_meta_data->>'birth_date')::date;
  EXCEPTION WHEN OTHERS THEN
    meta_birth_date := NULL;
  END;

  IF meta_birth_date IS NOT NULL
     AND meta_birth_date <= (CURRENT_DATE - INTERVAL '18 years')::date THEN
    INSERT INTO public.dtnascimento (user_id, birth_date)
    VALUES (NEW.id, meta_birth_date)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;

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
  age_days        INT
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
    EXTRACT(DAY FROM age(CURRENT_DATE, d.birth_date))::int AS age_days
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  LEFT JOIN public.dtnascimento d ON d.user_id = u.id
  LEFT JOIN public.user_registry us ON us.user_id = u.id
  ORDER BY u.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_list_users() TO authenticated;

-- ============================================================
-- Contagem de login. auth.users.last_sign_in_at já é atualizado pelo
-- GoTrue (o serviço de auth do Supabase) a cada login de verdade — não em
-- cada refresh de token, só quando alguém entra de fato. Um gatilho nessa
-- mudança específica conta sem duplicar nenhuma lógica de autenticação.
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_user_sign_in()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.last_sign_in_at IS DISTINCT FROM OLD.last_sign_in_at THEN
    UPDATE public.user_registry
    SET login_count = login_count + 1
    WHERE user_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS on_auth_user_sign_in ON auth.users;

CREATE TRIGGER on_auth_user_sign_in
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_sign_in();

-- ============================================================
-- admin_set_user_banned() passa a registrar QUANDO desativou, não só que
-- está desativado — banned_until vira "banido para sempre" (now + 100
-- anos), o que nunca disse quando a desativação aconteceu.
-- ============================================================

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

  UPDATE public.user_registry
  SET deactivated_at = CASE WHEN banned THEN now() ELSE NULL END
  WHERE user_id = target_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_set_user_banned(UUID, BOOLEAN) TO authenticated;

-- ============================================================
-- A view em si — "SELECT * FROM user_sequence" a partir de agora.
-- ============================================================

CREATE VIEW public.user_sequence AS
SELECT
  r.id,
  r.user_id,
  p.display_name  AS nome_completo,
  d.birth_date    AS dtnascimento,
  u.email,
  r.created_at,
  r.deactivated_at,
  r.login_count,
  u.last_sign_in_at AS ultimo_login
FROM public.user_registry r
JOIN auth.users u ON u.id = r.user_id
LEFT JOIN public.profiles p ON p.id = r.user_id
LEFT JOIN public.dtnascimento d ON d.user_id = r.user_id
ORDER BY r.id;
