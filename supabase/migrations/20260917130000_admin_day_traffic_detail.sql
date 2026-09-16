-- Detalhamento de tráfego de um dia específico, para o clique numa barra do
-- gráfico "Fluxo de pessoas" no painel administrativo.
--
-- Mesma base das funções de supabase/migrations/20260916120000_page_view_tracking.sql
-- (SECURITY DEFINER, checagem de is_admin(), created_at::date para achar o
-- dia), só que filtrando por uma data exata em vez de uma janela rolante de
-- `days_back` dias — não dá para reaproveitar admin_top_pages/admin_top_referrers
-- direto porque eles sempre contam a partir de hoje.
--
-- Devolve tudo numa função só (contagens + top páginas + top referrers como
-- jsonb) para o clique na barra custar uma única chamada.

CREATE OR REPLACE FUNCTION public.admin_day_traffic_detail(target_day DATE)
RETURNS TABLE (
  pageviews       BIGINT,
  unique_visitors BIGINT,
  top_pages       JSONB,
  top_referrers   JSONB
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
    count(*)::bigint,
    count(DISTINCT pv.visitor_id)::bigint,
    COALESCE(
      (SELECT jsonb_agg(t) FROM (
        SELECT path, count(*) AS views
        FROM public.page_views
        WHERE created_at::date = target_day
        GROUP BY path
        ORDER BY views DESC
        LIMIT 8
      ) t),
      '[]'::jsonb
    ),
    COALESCE(
      (SELECT jsonb_agg(t) FROM (
        SELECT referrer_host, count(*) AS views
        FROM public.page_views
        WHERE created_at::date = target_day AND referrer_host IS NOT NULL
        GROUP BY referrer_host
        ORDER BY views DESC
        LIMIT 8
      ) t),
      '[]'::jsonb
    )
  FROM public.page_views pv
  WHERE pv.created_at::date = target_day;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_day_traffic_detail(DATE) TO authenticated;
