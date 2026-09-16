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
