import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toJson } from '@/integrations/supabase/database';
import type { TravelState } from '@/types/travel';
import { queryKeys } from '@/data/queryKeys';

export type PlannerStepName =
  | 'budget' | 'month' | 'transport-arrival' | 'city' | 'accommodation' | 'local-transport' | 'summary';

export interface PlannerProgress {
  step: PlannerStepName;
  data: TravelState;
  updatedAt: string;
}

export function usePlannerProgress() {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.plannerProgress(user?.id ?? ''),
    queryFn: async (): Promise<PlannerProgress | null> => {
      const { data, error } = await supabase
        .from('planner_progress')
        .select('step, data, updated_at')
        .eq('user_id', user!.id)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return { step: data.step as PlannerStepName, data: data.data as unknown as TravelState, updatedAt: data.updated_at };
    },
    enabled: !!user,
  });
}

/**
 * Upsert silencioso: dispara a cada troca de etapa do assistente, no ritmo de
 * cliques de uma pessoa. Uma falha de rede aqui não pode travar a navegação
 * do usuário pelo assistente — só significa que o rascunho remoto ficou uma
 * etapa atrás, e a próxima troca de etapa tenta salvar de novo.
 */
export function useSavePlannerProgress() {
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ step, data }: { step: PlannerStepName; data: TravelState }) => {
      const { error } = await supabase
        .from('planner_progress')
        .upsert({ user_id: user!.id, step, data: toJson(data) });
      if (error) throw error;
    },
  });
}

export function useClearPlannerProgress() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('planner_progress').delete().eq('user_id', user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.setQueryData(queryKeys.plannerProgress(user?.id ?? ''), null);
    },
  });
}
