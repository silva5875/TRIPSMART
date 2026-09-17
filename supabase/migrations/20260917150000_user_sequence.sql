-- Numeração sequencial dos usuários (usuário #1, #2, #3...), pro painel
-- administrativo. `auth.users.id` é UUID — ótimo pra segurança, péssimo pra
-- um número que um humano reconheça de cabeça. Esta tabela é só isso: uma
-- ponte entre o UUID de verdade e um inteiro que só cresce.
--
-- Sem nenhuma política de RLS de propósito, mesmo com RLS ligado: ninguém
-- lê ou escreve isto direto. Só dois caminhos tocam a tabela, os dois
-- SECURITY DEFINER (ignoram RLS por natureza) — o gatilho de cadastro
-- (grava) e admin_list_users() (lê, abaixo).

CREATE TABLE public.user_sequence (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id    UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_sequence ENABLE ROW LEVEL SECURITY;

-- Preenche quem já tinha conta antes desta tabela existir — na ordem de
-- cadastro, pra quem já é usuário há mais tempo ficar com o número menor.
INSERT INTO public.user_sequence (user_id)
SELECT id FROM auth.users
ORDER BY created_at ASC
ON CONFLICT (user_id) DO NOTHING;

-- handle_new_user() passa a numerar também. CREATE OR REPLACE porque a
-- função já existe (migration 20260916150000) — só adiciona um INSERT a
-- mais ao que já tinha.
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

  INSERT INTO public.user_sequence (user_id)
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

-- ============================================================
-- admin_list_users() passa a incluir o número sequencial.
--
-- DROP + CREATE (não CREATE OR REPLACE): mudar as colunas de saída de uma
-- função existente exige recriá-la — mesmo motivo da migration 20260916150000.
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
  LEFT JOIN public.user_sequence us ON us.user_id = u.id
  ORDER BY u.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_list_users() TO authenticated;
