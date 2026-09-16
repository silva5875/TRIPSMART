-- Tabela dedicada para data de nascimento, com controle de idade (18+) e
-- idade exata (anos, meses, dias) exposta para o painel administrativo.
--
-- Por que uma tabela separada em vez de continuar em profiles.birth_date
-- (que já existia): `profiles` tem a política "Anyone can view profiles"
-- (FOR SELECT TO authenticated USING (true)) — feita para expor display_name
-- e avatar_url na comunidade, mas isso também deixava a data de nascimento de
-- QUALQUER usuário legível por QUALQUER usuário logado. Esta migration corrige
-- essa exposição: dtnascimento só é legível pelo próprio dono ou por admin.
--
-- Sem política de INSERT/UPDATE/DELETE para authenticated/anon, de propósito:
-- os dois únicos caminhos de escrita são o trigger handle_new_user()
-- (SECURITY DEFINER, cadastro público) e a edge function admin-create-user
-- (service role, criação pelo admin) — ambos já ignoram RLS por natureza.

CREATE TABLE public.dtnascimento (
  user_id    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  birth_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT dtnascimento_idade_minima_18
    CHECK (birth_date <= (CURRENT_DATE - INTERVAL '18 years')::date)
);

ALTER TABLE public.dtnascimento ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own birth date, admins view any"
  ON public.dtnascimento FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

CREATE TRIGGER update_dtnascimento_updated_at
  BEFORE UPDATE ON public.dtnascimento
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Backfill de quem já tinha birth_date em profiles. O filtro de idade evita
-- que um dado legado que não bateria mais os 18 anos de hoje quebre a
-- constraint recém-criada.
INSERT INTO public.dtnascimento (user_id, birth_date)
SELECT id, birth_date
FROM public.profiles
WHERE birth_date IS NOT NULL
  AND birth_date <= (CURRENT_DATE - INTERVAL '18 years')::date
ON CONFLICT (user_id) DO NOTHING;

-- handle_new_user() passa a gravar em dtnascimento em vez de profiles.
-- birth_date continua OPCIONAL aqui: quem entra pelo Google não fornece esse
-- dado, e isso não pode impedir a criação da conta — só grava quando vier um
-- valor presente, válido e que já bate os 18 anos (o formulário já garante
-- isso; isto é defesa a mais, não a checagem principal).
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

-- profiles.birth_date sai de cena — dtnascimento é a única fonte agora.
ALTER TABLE public.profiles DROP COLUMN IF EXISTS birth_date;

-- ============================================================
-- admin_list_users() passa a incluir nascimento e idade exata.
--
-- age(data1, data2) já é do Postgres e resolve corretamente o calendário
-- (meses de tamanho diferente, ano bissexto) — não há motivo para
-- reimplementar essa conta à mão.
--
-- DROP + CREATE (não CREATE OR REPLACE): mudar as colunas de saída de uma
-- função existente exige recriá-la.
-- ============================================================

DROP FUNCTION IF EXISTS public.admin_list_users();

CREATE FUNCTION public.admin_list_users()
RETURNS TABLE (
  id              UUID,
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
  ORDER BY u.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_list_users() TO authenticated;
