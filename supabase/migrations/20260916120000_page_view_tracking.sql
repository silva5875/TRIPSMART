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
