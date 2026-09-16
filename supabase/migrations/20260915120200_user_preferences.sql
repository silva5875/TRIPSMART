-- Perfil de gosto do usuário, usado para personalizar os roteiros.
-- Depende de 20260915120100_add_personalization_columns.sql (usa activity_reviews.category
-- e travel_history.city_id/days).
--
-- As preferências são DERIVADAS do que o usuário já fez, não declaradas num
-- formulário: ninguém preenche formulário de preferências num MVP. A coluna
-- `source` existe para o dia em que houver declaração explícita conviver com a
-- derivação.

CREATE TABLE public.user_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Derivado de activity_reviews com score >= 4.
  favorite_categories TEXT[] NOT NULL DEFAULT '{}',

  -- Numérico de propósito, e não o id da faixa ('moderado'): o vocabulário de
  -- faixas do front muda, o dado no banco não deveria mudar junto.
  typical_budget_min NUMERIC,
  typical_budget_max NUMERIC,

  default_group_type        TEXT,
  preferred_transport       TEXT,
  preferred_local_transport TEXT,
  typical_days              INTEGER,

  source         TEXT    NOT NULL DEFAULT 'derived',
  schema_version INTEGER NOT NULL DEFAULT 1,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  CONSTRAINT user_preferences_source_valid CHECK (source IN ('derived', 'declared', 'mixed'))
);

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own preferences"
  ON public.user_preferences FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
  ON public.user_preferences FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
  ON public.user_preferences FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own preferences"
  ON public.user_preferences FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Cria a linha de preferências junto com o profile no signup.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, display_name, birth_date)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    (NEW.raw_user_meta_data->>'birth_date')::date
  );

  INSERT INTO public.user_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$function$;

-- Backfill para quem já tem conta.
INSERT INTO public.user_preferences (user_id)
SELECT id FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- Recalcula as preferências do usuário autenticado a partir do que ele já fez.
-- Sem argumento de propósito: usa auth.uid(), então um usuário não consegue
-- recalcular (nem inferir) o perfil de outro.
CREATE OR REPLACE FUNCTION public.refresh_my_preferences()
RETURNS public.user_preferences
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  uid    UUID := auth.uid();
  result public.user_preferences;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  INSERT INTO public.user_preferences (user_id)
  VALUES (uid)
  ON CONFLICT (user_id) DO NOTHING;

  UPDATE public.user_preferences p SET
    favorite_categories = COALESCE((
      SELECT array_agg(category ORDER BY n DESC, category)
      FROM (
        SELECT category, count(*) AS n
        FROM public.activity_reviews
        WHERE user_id = uid AND score >= 4 AND category IS NOT NULL
        GROUP BY category
        ORDER BY n DESC, category
        LIMIT 3
      ) top
    ), '{}'),

    typical_budget_min = (
      SELECT min(budget) FROM (
        SELECT budget FROM public.travel_history
        WHERE user_id = uid ORDER BY created_at DESC LIMIT 10
      ) recent
    ),
    typical_budget_max = (
      SELECT max(budget) FROM (
        SELECT budget FROM public.travel_history
        WHERE user_id = uid ORDER BY created_at DESC LIMIT 10
      ) recent
    ),

    default_group_type = (
      SELECT mode() WITHIN GROUP (ORDER BY group_type)
      FROM public.travel_history WHERE user_id = uid
    ),
    preferred_transport = (
      SELECT mode() WITHIN GROUP (ORDER BY transport_to_destination)
      FROM public.travel_history
      WHERE user_id = uid AND transport_to_destination IS NOT NULL
        AND transport_to_destination <> 'undecided'
    ),
    preferred_local_transport = (
      SELECT mode() WITHIN GROUP (ORDER BY local_transport)
      FROM public.travel_history
      WHERE user_id = uid AND local_transport IS NOT NULL
        AND local_transport <> 'undecided'
    ),
    typical_days = (
      SELECT round(avg(days))::int
      FROM public.travel_history WHERE user_id = uid AND days IS NOT NULL
    ),

    source = CASE WHEN p.source = 'declared' THEN 'mixed' ELSE p.source END
  WHERE p.user_id = uid
  RETURNING p.* INTO result;

  RETURN result;
END;
$function$;

REVOKE ALL ON FUNCTION public.refresh_my_preferences() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.refresh_my_preferences() TO authenticated;
