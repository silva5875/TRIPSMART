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
