-- 'dev' deixa de ser só uma etiqueta visual e passa a dar o mesmo acesso de
-- 'admin' em todo o sistema. `is_admin()` é o único portão usado por todas as
-- políticas de RLS e funções `admin_*` (ver comentário em
-- 20260916140000_add_dev_role.sql, que documentava o comportamento antigo) —
-- então basta ensiná-lo a também aceitar 'dev' para a mudança valer em todo
-- lugar de uma vez, sem precisar caçar cada política uma por uma.

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'dev');
$$;
