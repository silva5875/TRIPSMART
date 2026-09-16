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
