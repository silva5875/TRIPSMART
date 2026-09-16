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
