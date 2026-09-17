-- Mais colunas na view user_sequence (migration 20260917160000) e a
-- capacidade de desativar por UPDATE direto nela.

DROP VIEW IF EXISTS public.user_sequence;

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
  u.last_sign_in_at AS ultimo_login,
  CASE WHEN EXISTS (
    SELECT 1 FROM public.user_roles ur WHERE ur.user_id = r.user_id AND ur.role = 'admin'
  ) THEN 'Admin' ELSE 'Cliente' END AS permissao,
  (
    SELECT count(*) FROM public.shared_itineraries si
    WHERE si.user_id = r.user_id AND si.deleted_at IS NULL
  ) AS qtd_publicacoes,
  (
    SELECT count(*) FROM public.shared_itineraries si
    WHERE si.user_id = r.user_id AND si.deleted_at IS NULL
  ) > 0 AS publicou_comunidade,
  (
    SELECT count(*) FROM public.travel_history th
    WHERE th.user_id = r.user_id AND th.deleted_at IS NULL
  ) AS roteiros_gerados
FROM public.user_registry r
JOIN auth.users u ON u.id = r.user_id
LEFT JOIN public.profiles p ON p.id = r.user_id
LEFT JOIN public.dtnascimento d ON d.user_id = r.user_id
ORDER BY r.id;

-- ============================================================
-- Desativar por UPDATE direto na view.
--
-- Uma view sobre várias tabelas não é atualizável sozinha — precisa de um
-- gatilho INSTEAD OF que traduza o UPDATE pedido em operações nas tabelas de
-- verdade. Só a mudança em `deactivated_at` tem efeito: as outras colunas
-- (nome, email, contagens...) são todas calculadas, não fazem sentido
-- gravar de volta.
--
--   UPDATE user_sequence SET deactivated_at = now() WHERE user_id = '...'; -- desativa
--   UPDATE user_sequence SET deactivated_at = NULL  WHERE user_id = '...'; -- reativa
--
-- Mesmo efeito de admin_set_user_banned() (banned_until = agora + 100 anos,
-- ou NULL) — só que disparado direto pelo SQL Editor, sem passar pelo app.
-- ============================================================

CREATE OR REPLACE FUNCTION public.user_sequence_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.deactivated_at IS DISTINCT FROM OLD.deactivated_at THEN
    UPDATE auth.users
    SET banned_until = CASE WHEN NEW.deactivated_at IS NOT NULL THEN (now() + interval '100 years') ELSE NULL END
    WHERE id = OLD.user_id;

    UPDATE public.user_registry
    SET deactivated_at = NEW.deactivated_at
    WHERE user_id = OLD.user_id;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS user_sequence_update_trigger ON public.user_sequence;

CREATE TRIGGER user_sequence_update_trigger
  INSTEAD OF UPDATE ON public.user_sequence
  FOR EACH ROW EXECUTE FUNCTION public.user_sequence_update();
