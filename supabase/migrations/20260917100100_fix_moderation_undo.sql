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
