-- ============================================================
-- TripSmart — script de setup completo do banco (Supabase)
-- Gerado automaticamente concatenando supabase/migrations/*.sql
-- na ordem cronologica. Use apenas para criar um banco do zero;
-- para um banco existente, aplique as migrations novas uma a uma.
-- ============================================================

-- ============================================================
-- Migration: 20260314233525_94608e04-4d6a-47c8-8b0e-3bdaebab41d2.sql
-- ============================================================


-- Create function to update timestamps (if not exists)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create travel_history table
CREATE TABLE public.travel_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  budget NUMERIC NOT NULL,
  people INTEGER NOT NULL DEFAULT 1,
  group_type TEXT NOT NULL DEFAULT 'solo',
  country TEXT NOT NULL,
  state TEXT NOT NULL,
  entertainment TEXT[] NOT NULL DEFAULT '{}',
  food TEXT[] NOT NULL DEFAULT '{}',
  accommodation TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.travel_history ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own travel history"
  ON public.travel_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own travel history"
  ON public.travel_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own travel history"
  ON public.travel_history FOR DELETE
  USING (auth.uid() = user_id);

-- Timestamp trigger
CREATE TRIGGER update_travel_history_updated_at
  BEFORE UPDATE ON public.travel_history
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Index for user queries
CREATE INDEX idx_travel_history_user_id ON public.travel_history(user_id);


-- ============================================================
-- Migration: 20260315182058_0c735838-524d-4c30-a4d7-59b9cd1548eb.sql
-- ============================================================

ALTER TABLE public.travel_history 
  ADD COLUMN IF NOT EXISTS month integer,
  ADD COLUMN IF NOT EXISTS transport_to_destination text,
  ADD COLUMN IF NOT EXISTS tourist_spots jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS local_transport text,
  ADD COLUMN IF NOT EXISTS restaurants jsonb DEFAULT '[]'::jsonb;

-- ============================================================
-- Migration: 20260317152921_e74ac6d6-88ca-42de-9c25-0ecf152ea5c8.sql
-- ============================================================


-- Shared itineraries table
CREATE TABLE public.shared_itineraries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  budget NUMERIC NOT NULL,
  budget_label TEXT NOT NULL,
  people INTEGER NOT NULL DEFAULT 1,
  days INTEGER NOT NULL DEFAULT 3,
  group_type TEXT NOT NULL DEFAULT 'solo',
  month INTEGER,
  transport_to_destination TEXT,
  city TEXT NOT NULL,
  city_name TEXT NOT NULL,
  selected_spots JSONB NOT NULL DEFAULT '[]'::jsonb,
  accommodation JSONB,
  local_transport TEXT,
  itinerary_data JSONB,
  map_data JSONB,
  rating_avg NUMERIC DEFAULT 0,
  rating_count INTEGER DEFAULT 0,
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.shared_itineraries ENABLE ROW LEVEL SECURITY;

-- Everyone can view shared itineraries
CREATE POLICY "Anyone can view shared itineraries" ON public.shared_itineraries FOR SELECT TO authenticated USING (true);
-- Users can create their own
CREATE POLICY "Users can create itineraries" ON public.shared_itineraries FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
-- Users can update their own
CREATE POLICY "Users can update own itineraries" ON public.shared_itineraries FOR UPDATE TO authenticated USING (auth.uid() = user_id);
-- Users can delete their own
CREATE POLICY "Users can delete own itineraries" ON public.shared_itineraries FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Likes table
CREATE TABLE public.itinerary_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  itinerary_id UUID REFERENCES public.shared_itineraries(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, itinerary_id)
);

ALTER TABLE public.itinerary_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view likes" ON public.itinerary_likes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can like" ON public.itinerary_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unlike" ON public.itinerary_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Comments table
CREATE TABLE public.itinerary_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  itinerary_id UUID REFERENCES public.shared_itineraries(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.itinerary_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view comments" ON public.itinerary_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can comment" ON public.itinerary_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own comments" ON public.itinerary_comments FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Saved itineraries
CREATE TABLE public.saved_itineraries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  itinerary_id UUID REFERENCES public.shared_itineraries(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, itinerary_id)
);

ALTER TABLE public.saved_itineraries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own saves" ON public.saved_itineraries FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can save" ON public.saved_itineraries FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unsave" ON public.saved_itineraries FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Ratings table
CREATE TABLE public.itinerary_ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  itinerary_id UUID REFERENCES public.shared_itineraries(id) ON DELETE CASCADE NOT NULL,
  score INTEGER NOT NULL CHECK (score >= 1 AND score <= 5),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, itinerary_id)
);

ALTER TABLE public.itinerary_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view ratings" ON public.itinerary_ratings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can rate" ON public.itinerary_ratings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own rating" ON public.itinerary_ratings FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Profiles table for displaying user info on shared itineraries
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable realtime for social features
ALTER PUBLICATION supabase_realtime ADD TABLE public.shared_itineraries;
ALTER PUBLICATION supabase_realtime ADD TABLE public.itinerary_comments;


-- ============================================================
-- Migration: 20260330004918_57841fca-9b91-411b-9c0a-b89216974e3a.sql
-- ============================================================


-- 1. Fix travel_history: scope policies to authenticated and add UPDATE policy
ALTER POLICY "Users can view their own travel history" ON public.travel_history TO authenticated;
ALTER POLICY "Users can create their own travel history" ON public.travel_history TO authenticated;
ALTER POLICY "Users can delete their own travel history" ON public.travel_history TO authenticated;

CREATE POLICY "Users can update their own travel history"
  ON public.travel_history FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 2. Fix shared_itineraries: create triggers to auto-update aggregates
-- so owners can't falsify them directly

-- Function to recalculate likes_count
CREATE OR REPLACE FUNCTION public.update_itinerary_likes_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE shared_itineraries SET likes_count = (
      SELECT COUNT(*) FROM itinerary_likes WHERE itinerary_id = NEW.itinerary_id
    ) WHERE id = NEW.itinerary_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE shared_itineraries SET likes_count = (
      SELECT COUNT(*) FROM itinerary_likes WHERE itinerary_id = OLD.itinerary_id
    ) WHERE id = OLD.itinerary_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_update_likes_count
  AFTER INSERT OR DELETE ON public.itinerary_likes
  FOR EACH ROW EXECUTE FUNCTION public.update_itinerary_likes_count();

-- Function to recalculate rating_avg and rating_count
CREATE OR REPLACE FUNCTION public.update_itinerary_rating_stats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_id := OLD.itinerary_id;
  ELSE
    target_id := NEW.itinerary_id;
  END IF;

  UPDATE shared_itineraries SET
    rating_avg = COALESCE((SELECT AVG(score)::numeric FROM itinerary_ratings WHERE itinerary_id = target_id), 0),
    rating_count = (SELECT COUNT(*) FROM itinerary_ratings WHERE itinerary_id = target_id)
  WHERE id = target_id;

  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_update_rating_stats
  AFTER INSERT OR UPDATE OR DELETE ON public.itinerary_ratings
  FOR EACH ROW EXECUTE FUNCTION public.update_itinerary_rating_stats();

-- Replace the UPDATE policy to prevent direct aggregate manipulation
DROP POLICY "Users can update own itineraries" ON public.shared_itineraries;

CREATE POLICY "Users can update own itineraries"
  ON public.shared_itineraries FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND rating_avg IS NOT DISTINCT FROM (SELECT rating_avg FROM shared_itineraries WHERE id = shared_itineraries.id)
    AND rating_count IS NOT DISTINCT FROM (SELECT rating_count FROM shared_itineraries WHERE id = shared_itineraries.id)
    AND likes_count IS NOT DISTINCT FROM (SELECT likes_count FROM shared_itineraries WHERE id = shared_itineraries.id)
  );


-- ============================================================
-- Migration: 20260330165041_740bede7-1637-4e11-a6d1-758b8687f17a.sql
-- ============================================================

ALTER TABLE public.profiles ADD COLUMN birth_date date;

-- ============================================================
-- Migration: 20260330165123_24b97702-8411-4d7f-8177-17e027e7b69b.sql
-- ============================================================

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
  RETURN NEW;
END;
$function$;

-- ============================================================
-- Migration: 20260407124907_2a730826-a17d-4ee9-8326-93843785192f.sql
-- ============================================================


CREATE TABLE public.accommodation_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  accommodation_name TEXT NOT NULL,
  city_id TEXT NOT NULL,
  score INTEGER NOT NULL CHECK (score >= 1 AND score <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.accommodation_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view accommodation reviews" ON public.accommodation_reviews FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create own accommodation reviews" ON public.accommodation_reviews FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own accommodation reviews" ON public.accommodation_reviews FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE UNIQUE INDEX idx_accommodation_reviews_unique ON public.accommodation_reviews (user_id, accommodation_name, city_id);

CREATE TABLE public.activity_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  activity_name TEXT NOT NULL,
  city_id TEXT NOT NULL,
  score INTEGER NOT NULL CHECK (score >= 1 AND score <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.activity_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view activity reviews" ON public.activity_reviews FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create own activity reviews" ON public.activity_reviews FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own activity reviews" ON public.activity_reviews FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE UNIQUE INDEX idx_activity_reviews_unique ON public.activity_reviews (user_id, activity_name, city_id);


-- ============================================================
-- Migration: 20260915120000_normalize_city_id.sql
-- ============================================================

-- Normaliza city_id para o slug canônico da cidade.
--
-- Problema: StepSummary gravava city_id como slug ("porto-galinhas") enquanto
-- TravelHistory gravava como texto livre ("Porto de Galinhas, PE"). As duas
-- formas nunca casavam, então uma avaliação feita no Histórico era invisível
-- para o Planner.
--
-- A ordem aqui é obrigatória: existe idx_activity_reviews_unique
-- (user_id, activity_name, city_id). Atualizar o city_id antes de deduplicar
-- viola esse índice sempre que o mesmo usuário avaliou a mesma atividade pelos
-- dois caminhos, e a migration morre no meio.
--
-- Rode supabase/scripts/preview_city_id_dedup.sql ANTES para ver quantas linhas
-- serão fundidas.

-- 1. Mapa de alias -> slug. A lista de cidades é fixa em src/data/mockData.ts.
CREATE TABLE IF NOT EXISTS public.city_aliases (
  alias   TEXT PRIMARY KEY,
  city_id TEXT NOT NULL
);

ALTER TABLE public.city_aliases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read city aliases"
  ON public.city_aliases FOR SELECT TO authenticated USING (true);

INSERT INTO public.city_aliases (alias, city_id) VALUES
  ('Recife, PE',                  'recife'),
  ('Olinda, PE',                  'olinda'),
  ('Fernando de Noronha, PE',     'noronha'),
  ('Porto de Galinhas, PE',       'porto-galinhas'),
  ('Caruaru, PE',                 'caruaru'),
  ('Gravatá, PE',                 'gravata'),
  ('Petrolina, PE',               'petrolina'),
  ('Garanhuns, PE',               'garanhuns'),
  ('Serra Talhada, PE',           'serra-talhada'),
  ('Goiana, PE',                  'goiana'),
  ('Cabo de Santo Agostinho, PE', 'cabo-santo-agostinho'),
  ('Tamandaré, PE',               'tamandare')
ON CONFLICT (alias) DO UPDATE SET city_id = EXCLUDED.city_id;

-- 2. Deduplicar ANTES do update, mantendo a avaliação mais recente de cada
--    (user_id, nome, city_id normalizado).
WITH normalized AS (
  SELECT r.id,
         r.user_id,
         r.activity_name,
         COALESCE(a.city_id, r.city_id) AS new_city_id,
         r.created_at
  FROM public.activity_reviews r
  LEFT JOIN public.city_aliases a ON a.alias = r.city_id
),
ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY user_id, activity_name, new_city_id
           ORDER BY created_at DESC, id DESC
         ) AS rn
  FROM normalized
)
DELETE FROM public.activity_reviews
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

WITH normalized AS (
  SELECT r.id,
         r.user_id,
         r.accommodation_name,
         COALESCE(a.city_id, r.city_id) AS new_city_id,
         r.created_at
  FROM public.accommodation_reviews r
  LEFT JOIN public.city_aliases a ON a.alias = r.city_id
),
ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY user_id, accommodation_name, new_city_id
           ORDER BY created_at DESC, id DESC
         ) AS rn
  FROM normalized
)
DELETE FROM public.accommodation_reviews
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- 3. Só agora normalizar.
UPDATE public.activity_reviews r
SET city_id = a.city_id
FROM public.city_aliases a
WHERE a.alias = r.city_id;

UPDATE public.accommodation_reviews r
SET city_id = a.city_id
FROM public.city_aliases a
WHERE a.alias = r.city_id;

-- 4. Impedir regressão. NOT VALID de propósito: passa a valer para linhas novas
--    sem quebrar a migration caso exista algum city_id legado fora do padrão.
--    Depois de conferir os dados, promova com:
--      ALTER TABLE public.activity_reviews VALIDATE CONSTRAINT activity_reviews_city_id_is_slug;
ALTER TABLE public.activity_reviews
  ADD CONSTRAINT activity_reviews_city_id_is_slug
  CHECK (city_id = lower(city_id) AND city_id NOT LIKE '%,%') NOT VALID;

ALTER TABLE public.accommodation_reviews
  ADD CONSTRAINT accommodation_reviews_city_id_is_slug
  CHECK (city_id = lower(city_id) AND city_id NOT LIKE '%,%') NOT VALID;

CREATE INDEX IF NOT EXISTS idx_activity_reviews_city_id
  ON public.activity_reviews (city_id);

CREATE INDEX IF NOT EXISTS idx_accommodation_reviews_city_id
  ON public.accommodation_reviews (city_id);


-- ============================================================
-- Migration: 20260915120100_add_personalization_columns.sql
-- ============================================================

-- Colunas que faltavam para conseguir derivar preferências de viagem.
-- Depende de 20260915120000_normalize_city_id.sql (usa public.city_aliases).

-- A peça central: sem a categoria da atividade não existe "esse usuário gosta
-- de praia". A avaliação guardava só o nome, que não diz nada sobre o gosto.
-- Valores seguem TouristSpot['category'] em src/types/travel.ts.
ALTER TABLE public.activity_reviews
  ADD COLUMN IF NOT EXISTS category TEXT;

ALTER TABLE public.activity_reviews
  ADD CONSTRAINT activity_reviews_category_valid
  CHECK (category IS NULL OR category IN
    ('turismo', 'praia', 'trilha', 'entretenimento', 'cultura', 'natureza'))
  NOT VALID;

-- travel_history só tinha `state` como texto livre ("Porto de Galinhas, PE"),
-- o que impede qualquer junção com as avaliações.
ALTER TABLE public.travel_history
  ADD COLUMN IF NOT EXISTS city_id TEXT;

-- A duração da viagem nunca foi persistida, então "duração típica" era
-- inderivável mesmo tendo o dado na tela.
ALTER TABLE public.travel_history
  ADD COLUMN IF NOT EXISTS days INTEGER;

UPDATE public.travel_history h
SET city_id = a.city_id
FROM public.city_aliases a
WHERE a.alias = h.state
  AND h.city_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_travel_history_city_id
  ON public.travel_history (city_id);


-- ============================================================
-- Migration: 20260915120200_user_preferences.sql
-- ============================================================

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


-- ============================================================
-- Migration: 20260916100000_roles_and_soft_delete.sql
-- ============================================================

-- Papéis de acesso + soft delete em travel_history, shared_itineraries e
-- itinerary_comments.
--
-- Registros apagados somem para o usuário final e continuam visíveis para quem
-- tem papel de admin, que pode restaurá-los.

-- ============================================================
-- 1. PAPÉIS
-- ============================================================
--
-- SEGURANÇA: o papel mora em tabela própria, NUNCA como coluna em `profiles`.
-- O usuário tem permissão de atualizar o próprio perfil, então um campo `role`
-- lá dentro permitiria que ele se promovesse a admin sozinho.
--
-- Esta tabela não recebe política de INSERT/UPDATE/DELETE para usuários: papéis
-- só são concedidos pelo SQL Editor do painel ou pela service_role.

CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE public.user_roles (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       public.app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX idx_user_roles_user_id ON public.user_roles (user_id);

-- SECURITY DEFINER é obrigatório aqui: a função é chamada de dentro das
-- políticas de user_roles indiretamente, e sem isso o RLS entraria em recursão.
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin');
$$;

GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- ============================================================
-- 2. COLUNAS DE SOFT DELETE
-- ============================================================
--
-- `deleted_at` em vez de um booleano: carrega QUANDO foi apagado, e NULL já
-- significa "ativo" sem precisar de valor padrão.
-- `deleted_by` distingue o que o dono apagou do que a moderação removeu.

ALTER TABLE public.travel_history
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.shared_itineraries
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.itinerary_comments
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Índices parciais: a consulta esmagadoramente mais comum é "só os ativos".
CREATE INDEX IF NOT EXISTS idx_travel_history_ativos
  ON public.travel_history (user_id, created_at DESC) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_shared_itineraries_ativos
  ON public.shared_itineraries (created_at DESC) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_itinerary_comments_ativos
  ON public.itinerary_comments (itinerary_id, created_at) WHERE deleted_at IS NULL;

-- ============================================================
-- 3. REGRAS DE ACESSO
-- ============================================================
--
-- Esconder é responsabilidade do BANCO, não do front. Se o filtro vivesse só na
-- aplicação, qualquer consulta nova que esquecesse do `deleted_at` vazaria
-- registros apagados.

-- ---------- travel_history ----------
DROP POLICY IF EXISTS "Users can view their own travel history" ON public.travel_history;
CREATE POLICY "Users can view their own travel history"
  ON public.travel_history FOR SELECT TO authenticated
  USING ((auth.uid() = user_id AND deleted_at IS NULL) OR public.is_admin());

-- Sem hard delete: apagar agora é um UPDATE em deleted_at.
DROP POLICY IF EXISTS "Users can delete their own travel history" ON public.travel_history;

CREATE POLICY "Admins can update any travel history"
  ON public.travel_history FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ---------- shared_itineraries ----------
DROP POLICY IF EXISTS "Anyone can view shared itineraries" ON public.shared_itineraries;
CREATE POLICY "Anyone can view shared itineraries"
  ON public.shared_itineraries FOR SELECT TO authenticated
  USING (deleted_at IS NULL OR public.is_admin());

DROP POLICY IF EXISTS "Users can delete own itineraries" ON public.shared_itineraries;

CREATE POLICY "Admins can update any itinerary"
  ON public.shared_itineraries FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ---------- itinerary_comments ----------
DROP POLICY IF EXISTS "Anyone can view comments" ON public.itinerary_comments;
CREATE POLICY "Anyone can view comments"
  ON public.itinerary_comments FOR SELECT TO authenticated
  USING (deleted_at IS NULL OR public.is_admin());

DROP POLICY IF EXISTS "Users can delete own comments" ON public.itinerary_comments;

-- Comentários não tinham política de UPDATE; o autor precisa de uma para
-- conseguir apagar o próprio comentário.
CREATE POLICY "Users can soft delete own comments"
  ON public.itinerary_comments FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update any comment"
  ON public.itinerary_comments FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================
-- 4. COMO CONCEDER O PAPEL DE ADMIN
-- ============================================================
--
-- Não há como fazer isso pelo app, de propósito. No SQL Editor do painel,
-- troque o email e rode:
--
--   INSERT INTO public.user_roles (user_id, role)
--   SELECT id, 'admin' FROM auth.users WHERE email = 'seu-email@exemplo.com'
--   ON CONFLICT (user_id, role) DO NOTHING;


-- ============================================================
-- Migration: 20260916110000_admin_dashboard_and_users.sql
-- ============================================================

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


-- ============================================================
-- Migration: 20260916120000_page_view_tracking.sql
-- ============================================================

-- Rastreamento de tráfego, incluindo visitantes não logados.
--
-- Design de privacidade, de propósito:
--   * Nenhum IP é guardado (o cliente não tem acesso ao próprio IP; nada aqui
--     tenta capturá-lo por outra via).
--   * Nenhum fingerprint de dispositivo. O "visitante" é um UUID aleatório
--     gerado no navegador (localStorage) — não deriva de nada que identifique
--     a pessoa, só permite contar "quantos dispositivos distintos" sem saber
--     quem são.
--   * Do referrer só guardamos o HOST (ex.: "google.com"), nunca a URL
--     completa — evita capturar querystring de terceiros, que às vezes carrega
--     dado sensível (termo de busca, token, email em link).
--   * Linhas cruas não são legíveis por ninguém, nem pelo próprio visitante:
--     só agregados, e só para admin, via funções abaixo.
--
-- Limitação inerente a qualquer analytics client-side: como o INSERT precisa
-- ser público (o visitante não está logado), alguém com o DevTools aberto
-- pode inserir eventos falsos. Isso vale para qualquer ferramenta desse tipo
-- (GA, Plausible, etc.) — não é uma falha específica deste desenho.

CREATE TABLE public.page_views (
  id            UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  path          TEXT NOT NULL CHECK (char_length(path) <= 500 AND path LIKE '/%'),
  referrer_host TEXT CHECK (referrer_host IS NULL OR char_length(referrer_host) <= 255),
  visitor_id    UUID NOT NULL,
  session_id    UUID NOT NULL,
  user_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  device_type   TEXT CHECK (device_type IN ('mobile', 'desktop')),
  created_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;

-- Só INSERT é liberado, e para qualquer um — logado ou não. Não há política de
-- SELECT: nenhum client (nem autenticado comum) lê linha crua desta tabela,
-- só as funções SECURITY DEFINER abaixo, restritas a admin.
CREATE POLICY "Anyone can record a page view"
  ON public.page_views FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE INDEX idx_page_views_created_at ON public.page_views (created_at);
CREATE INDEX idx_page_views_path ON public.page_views (path);
CREATE INDEX idx_page_views_visitor_id ON public.page_views (visitor_id);

-- ============================================================
-- Agregados para o painel administrativo
-- ============================================================

CREATE OR REPLACE FUNCTION public.admin_traffic_overview(days_back INT DEFAULT 30)
RETURNS TABLE (
  pageviews       BIGINT,
  unique_visitors BIGINT,
  unique_sessions BIGINT,
  pageviews_today BIGINT
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
    count(*),
    count(DISTINCT visitor_id),
    count(DISTINCT session_id),
    (SELECT count(*) FROM public.page_views WHERE created_at::date = current_date)
  FROM public.page_views
  WHERE created_at >= now() - (days_back || ' days')::interval;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_traffic_overview(INT) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_traffic_series(days_back INT DEFAULT 30)
RETURNS TABLE (day DATE, pageviews BIGINT, visitors BIGINT)
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
    COALESCE((SELECT count(*) FROM public.page_views pv WHERE pv.created_at::date = d.day), 0),
    COALESCE((SELECT count(DISTINCT visitor_id) FROM public.page_views pv WHERE pv.created_at::date = d.day), 0)
  FROM days d
  ORDER BY d.day;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_traffic_series(INT) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_top_pages(days_back INT DEFAULT 30, limit_count INT DEFAULT 10)
RETURNS TABLE (path TEXT, views BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  RETURN QUERY
  SELECT pv.path, count(*) AS views
  FROM public.page_views pv
  WHERE pv.created_at >= now() - (days_back || ' days')::interval
  GROUP BY pv.path
  ORDER BY views DESC
  LIMIT limit_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_top_pages(INT, INT) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_top_referrers(days_back INT DEFAULT 30, limit_count INT DEFAULT 10)
RETURNS TABLE (referrer_host TEXT, views BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  RETURN QUERY
  SELECT pv.referrer_host, count(*) AS views
  FROM public.page_views pv
  WHERE pv.created_at >= now() - (days_back || ' days')::interval
    AND pv.referrer_host IS NOT NULL
  GROUP BY pv.referrer_host
  ORDER BY views DESC
  LIMIT limit_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_top_referrers(INT, INT) TO authenticated;


-- ============================================================
-- Migration: 20260916130000_fix_page_view_insert_policy.sql
-- ============================================================

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


-- ============================================================
-- Migration: 20260916140000_add_dev_role.sql
-- ============================================================

-- Novo valor de app_role só para identificar visualmente a conta do
-- desenvolvedor responsável na aba Usuários — não concede nenhuma permissão
-- extra (quem decide acesso é 'admin', via is_admin(); 'dev' é só etiqueta).
--
-- Em arquivo separado de propósito: o Postgres não deixa usar um valor de
-- enum recém-adicionado na MESMA transação em que ele foi criado. Rode este
-- arquivo primeiro, sozinho, depois o de concessão
-- (20260916140100_grant_dev_role.sql) em uma segunda execução.

ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'dev';


-- ============================================================
-- Migration: 20260916140100_grant_dev_role.sql
-- ============================================================

-- Marca sua própria conta com a etiqueta "Dev responsável" na aba Usuários.
-- Rode DEPOIS de 20260916140000_add_dev_role.sql (numa segunda execução —
-- ver o comentário daquele arquivo sobre por quê).
--
-- Só concede a etiqueta em si; seu acesso de admin já veio de uma concessão
-- anterior e não muda aqui.

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'dev' FROM auth.users WHERE email = 'adonai5875@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;


-- ============================================================
-- Migration: 20260916150000_dtnascimento.sql
-- ============================================================

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


-- ============================================================
-- Migration: 20260917100000_fix_shared_itineraries_update_policy.sql
-- ============================================================

-- Corrige um bug real de RLS que quebra a edição de QUALQUER roteiro
-- compartilhado, para qualquer usuário, desde que existam 2+ roteiros na
-- tabela — encontrado numa revisão de código, não relatado por usuário.
--
-- A política "Users can update own itineraries" (recriada em
-- 20260330004918) usa, no WITH CHECK, uma subquery como:
--
--   (SELECT rating_avg FROM shared_itineraries WHERE id = shared_itineraries.id)
--
-- O `FROM shared_itineraries` da subquery introduz uma tabela com o MESMO
-- nome da tabela externa. Por regra de escopo do SQL, `shared_itineraries.id`
-- dentro da subquery se liga à tabela da PRÓPRIA subquery (a mais interna),
-- não à linha sendo verificada — a condição vira `id = id`, verdadeira para
-- toda linha da tabela. Com 2+ roteiros já cadastrados, a subquery devolve
-- mais de uma linha e o Postgres levanta "more than one row returned by a
-- subquery used as an expression" em QUALQUER UPDATE — a intenção original
-- (impedir que o dono falsifique rating_avg/likes_count) nunca chegou a
-- funcionar; o efeito real sempre foi travar toda edição.
--
-- A correção dá à subquery um alias diferente do nome da tabela externa, para
-- que a referência sem alias (`shared_itineraries.id`) volte a apontar para a
-- linha sendo verificada, e a subquery aliasada busque de fato o valor
-- ATUALMENTE salvo daquela linha (o que a política sempre quis comparar).

DROP POLICY IF EXISTS "Users can update own itineraries" ON public.shared_itineraries;

CREATE POLICY "Users can update own itineraries"
  ON public.shared_itineraries FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND rating_avg IS NOT DISTINCT FROM (
      SELECT stored.rating_avg FROM public.shared_itineraries stored WHERE stored.id = shared_itineraries.id
    )
    AND rating_count IS NOT DISTINCT FROM (
      SELECT stored.rating_count FROM public.shared_itineraries stored WHERE stored.id = shared_itineraries.id
    )
    AND likes_count IS NOT DISTINCT FROM (
      SELECT stored.likes_count FROM public.shared_itineraries stored WHERE stored.id = shared_itineraries.id
    )
  );


-- ============================================================
-- Migration: 20260917100100_fix_moderation_undo.sql
-- ============================================================

-- Corrige duas brechas de moderação encontradas numa revisão de código: o
-- próprio dono conseguia desfazer um soft-delete feito por admin.
--
-- Em travel_history e itinerary_comments, a migration de soft-delete
-- (20260916100000) criou "Admins can update any ..." mas nunca revogou a
-- política antiga do dono (USING/WITH CHECK só `auth.uid() = user_id`, sem
-- olhar `deleted_at`/`deleted_by`). Como políticas RLS permissivas se
-- combinam com OR, o dono ainda conseguia rodar
-- `UPDATE ... SET deleted_at = NULL WHERE id = <linha>` e reverter sozinho
-- uma remoção que um admin aplicou.
--
-- A correção deixa o dono seguir podendo apagar/gerenciar a PRÓPRIA linha
-- (inclusive desfazer o PRÓPRIO soft-delete, sem recurso pra isso na UI hoje,
-- mas sem motivo para proibir), MAS assim que `deleted_by` for de outra
-- pessoa (ou seja, foi moderação), a linha para de ser visível para o dono
-- nesta política — só a política de admin continua podendo tocá-la.

-- ---------- travel_history ----------
DROP POLICY IF EXISTS "Users can update their own travel history" ON public.travel_history;

CREATE POLICY "Users can update their own travel history"
  ON public.travel_history FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND (deleted_by IS NULL OR deleted_by = auth.uid()))
  WITH CHECK (auth.uid() = user_id AND (deleted_by IS NULL OR deleted_by = auth.uid()));

-- ---------- itinerary_comments ----------
DROP POLICY IF EXISTS "Users can soft delete own comments" ON public.itinerary_comments;

CREATE POLICY "Users can soft delete own comments"
  ON public.itinerary_comments FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND (deleted_by IS NULL OR deleted_by = auth.uid()))
  WITH CHECK (auth.uid() = user_id AND (deleted_by IS NULL OR deleted_by = auth.uid()));

-- ============================================================
-- Enquanto aqui: permite que o próprio usuário grave/edite a PRÓPRIA data de
-- nascimento em dtnascimento — hoje só existia SELECT (dono/admin) e escrita
-- via trigger de cadastro ou pela tela de admin. Necessário para o campo
-- novo em "Informações pessoais" no Perfil.
-- ============================================================

CREATE POLICY "Users can insert own birth date"
  ON public.dtnascimento FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own birth date"
  ON public.dtnascimento FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ============================================================
-- Migration: 20260917110000_travel_history_protocol.sql
-- ============================================================

-- Número de protocolo para cada viagem salva — uma referência curta e
-- sequencial que o usuário pode anotar/informar, ao contrário do UUID interno
-- (36 caracteres, impraticável de ditar ou digitar de cabeça).
--
-- Gerado pelo BANCO via sequence, nunca pelo cliente: assim é impossível
-- forjar ou repetir um número, e nem precisa mudar o código de insert — o
-- DEFAULT cuida disso sozinho, inclusive preenchendo as linhas que já
-- existem (nextval() é volátil, então o Postgres reescreve a tabela chamando
-- a função uma vez por linha, em vez de aplicar o mesmo valor a todas).

CREATE SEQUENCE IF NOT EXISTS public.travel_history_protocol_seq START WITH 1;

ALTER TABLE public.travel_history
  ADD COLUMN IF NOT EXISTS protocol_number BIGINT NOT NULL
    DEFAULT nextval('public.travel_history_protocol_seq');

ALTER TABLE public.travel_history
  ADD CONSTRAINT travel_history_protocol_number_unique UNIQUE (protocol_number);

-- Liga o ciclo de vida da sequence à coluna: se a coluna/tabela for dropada
-- um dia, a sequence é limpa junto em vez de ficar órfã.
ALTER SEQUENCE public.travel_history_protocol_seq OWNED BY public.travel_history.protocol_number;


-- ============================================================
-- Migration: 20260917120000_planner_progress.sql
-- ============================================================

-- Progresso do assistente de planejamento (Planner.tsx), salvo no banco a
-- cada etapa respondida — não só em sessionStorage.
--
-- sessionStorage some quando a aba fecha, quando o usuário troca de
-- dispositivo, ou entre logout/login em outra sessão do navegador. Como o
-- objetivo é retomar o planejamento em qualquer uma dessas situações (e não
-- só sobreviver a um F5 na mesma aba), o progresso precisa estar amarrado à
-- conta, não ao navegador.
--
-- Uma linha por usuário (PK em user_id, não uma tabela de histórico): cada
-- etapa respondida SUBSTITUI o rascunho anterior, exatamente como o
-- sessionStorage.setItem que ela troca. Ao concluir o assistente (etapa
-- 'summary') ou reiniciar, a linha é apagada — não há motivo para manter um
-- rascunho de uma viagem que já foi salva em travel_history.

CREATE TABLE public.planner_progress (
  user_id    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  step       TEXT NOT NULL,
  data       JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.planner_progress ENABLE ROW LEVEL SECURITY;

-- FOR ALL: o próprio dono é o único papel com qualquer acesso a este
-- rascunho (nem admin precisa vê-lo — não é dado de negócio, é estado de UI).
CREATE POLICY "Users manage own planner progress"
  ON public.planner_progress FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_planner_progress_updated_at
  BEFORE UPDATE ON public.planner_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


