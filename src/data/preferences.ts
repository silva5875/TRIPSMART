import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { UserPreferencesRow } from '@/integrations/supabase/database';
import { queryKeys } from './queryKeys';

export type UserPreferences = UserPreferencesRow;

export async function fetchPreferences(userId: string): Promise<UserPreferences | null> {
  const { data, error } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export function usePreferences() {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.preferences(user?.id ?? ''),
    queryFn: () => fetchPreferences(user!.id),
    enabled: !!user,
  });
}

/**
 * Recalcula as preferências a partir do histórico e das avaliações do usuário.
 * A função no banco usa `auth.uid()` e não aceita argumento, então ninguém
 * recalcula (nem infere) o perfil de outra pessoa.
 */
export function useRefreshPreferences() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('refresh_my_preferences');
      if (error) throw error;
      return data as UserPreferences;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.preferences(user?.id ?? ''), data);
    },
  });
}

/**
 * Recorte das preferências que vai no payload do n8n. Mantido separado da linha
 * do banco para que colunas novas não vazem para a integração sem intenção.
 */
export interface ItineraryPreferences {
  favoriteCategories: string[];
  typicalBudgetMin: number | null;
  typicalBudgetMax: number | null;
  typicalDays: number | null;
  defaultGroupType: string | null;
  preferredTransport: string | null;
  preferredLocalTransport: string | null;
}

export function toItineraryPreferences(
  preferences: UserPreferences | null | undefined
): ItineraryPreferences | null {
  if (!preferences) return null;
  return {
    favoriteCategories: preferences.favorite_categories ?? [],
    typicalBudgetMin: preferences.typical_budget_min,
    typicalBudgetMax: preferences.typical_budget_max,
    typicalDays: preferences.typical_days,
    defaultGroupType: preferences.default_group_type,
    preferredTransport: preferences.preferred_transport,
    preferredLocalTransport: preferences.preferred_local_transport,
  };
}
