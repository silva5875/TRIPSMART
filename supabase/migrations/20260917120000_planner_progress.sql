-- Progresso do assistente de planejamento (Planner.tsx), salvo no banco a
-- cada etapa respondida — não só em sessionStorage.
--
-- sessionStorage some quando a aba fecha, quando o usuário troca de
-- dispositivo, ou entre logout/login em outra sessão do navegador. Como o
-- objetivo é retomar o planejamento em qualquer uma dessas situações (e não
-- só sobreviver a um F5 na mesma aba), o progresso precisa estar amarrado à
-- conta, não ao navegador.
--
-- Uma linha por usuário (PK em user_id, não uma tabela de histórico): cada
-- etapa respondida SUBSTITUI o rascunho anterior, exatamente como o
-- sessionStorage.setItem que ela troca. Ao concluir o assistente (etapa
-- 'summary') ou reiniciar, a linha é apagada — não há motivo para manter um
-- rascunho de uma viagem que já foi salva em travel_history.

CREATE TABLE public.planner_progress (
  user_id    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  step       TEXT NOT NULL,
  data       JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.planner_progress ENABLE ROW LEVEL SECURITY;

-- FOR ALL: o próprio dono é o único papel com qualquer acesso a este
-- rascunho (nem admin precisa vê-lo — não é dado de negócio, é estado de UI).
CREATE POLICY "Users manage own planner progress"
  ON public.planner_progress FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_planner_progress_updated_at
  BEFORE UPDATE ON public.planner_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
