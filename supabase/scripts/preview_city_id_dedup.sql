-- SOMENTE LEITURA. Rode isto ANTES da migration 20260915120000_normalize_city_id.sql
-- para ver quantas avaliações serão fundidas na deduplicação.
--
-- Nenhuma linha é alterada aqui.

WITH aliases (alias, city_id) AS (
  VALUES
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
),
act AS (
  SELECT r.user_id,
         r.activity_name AS item_name,
         COALESCE(a.city_id, r.city_id) AS new_city_id
  FROM public.activity_reviews r
  LEFT JOIN aliases a ON a.alias = r.city_id
),
acc AS (
  SELECT r.user_id,
         r.accommodation_name AS item_name,
         COALESCE(a.city_id, r.city_id) AS new_city_id
  FROM public.accommodation_reviews r
  LEFT JOIN aliases a ON a.alias = r.city_id
)
SELECT 'activity_reviews' AS tabela,
       (SELECT count(*) FROM public.activity_reviews)                         AS linhas_hoje,
       (SELECT count(*) FROM (SELECT DISTINCT user_id, item_name, new_city_id FROM act) d) AS linhas_depois,
       (SELECT count(*) FROM public.activity_reviews)
         - (SELECT count(*) FROM (SELECT DISTINCT user_id, item_name, new_city_id FROM act) d) AS serao_apagadas
UNION ALL
SELECT 'accommodation_reviews',
       (SELECT count(*) FROM public.accommodation_reviews),
       (SELECT count(*) FROM (SELECT DISTINCT user_id, item_name, new_city_id FROM acc) d),
       (SELECT count(*) FROM public.accommodation_reviews)
         - (SELECT count(*) FROM (SELECT DISTINCT user_id, item_name, new_city_id FROM acc) d);

-- Quais city_id existem hoje e como cada um será normalizado.
-- Um 'city_id' que sobrar com vírgula ou maiúscula aqui é um alias que falta
-- mapear -- avise antes de aplicar a migration.
WITH aliases (alias, city_id) AS (
  VALUES
    ('Recife, PE','recife'), ('Olinda, PE','olinda'),
    ('Fernando de Noronha, PE','noronha'), ('Porto de Galinhas, PE','porto-galinhas'),
    ('Caruaru, PE','caruaru'), ('Gravatá, PE','gravata'),
    ('Petrolina, PE','petrolina'), ('Garanhuns, PE','garanhuns'),
    ('Serra Talhada, PE','serra-talhada'), ('Goiana, PE','goiana'),
    ('Cabo de Santo Agostinho, PE','cabo-santo-agostinho'), ('Tamandaré, PE','tamandare')
)
SELECT r.city_id AS city_id_atual,
       COALESCE(a.city_id, r.city_id) AS city_id_depois,
       count(*) AS linhas
FROM public.activity_reviews r
LEFT JOIN aliases a ON a.alias = r.city_id
GROUP BY 1, 2
ORDER BY 3 DESC;
