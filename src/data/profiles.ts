import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { queryKeys } from './queryKeys';

export interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

export function useProfile() {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.profile(user?.id ?? ''),
    queryFn: async (): Promise<Profile | null> => {
      // maybeSingle: `single()` devolve erro PGRST116 quando a linha ainda não
      // existe, o que polui o console sem motivo.
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user!.id)
        .maybeSingle();

      if (error) throw error;
      return data as Profile | null;
    },
    enabled: !!user,
  });
}

export interface ProfileStats {
  trips: number;
  shared: number;
  likes: number;
}

export function useProfileStats() {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.profileStats(user?.id ?? ''),
    queryFn: async (): Promise<ProfileStats> => {
      const [trips, shared, likes] = await Promise.all([
        // `.is('deleted_at', null)`: sem isso, uma viagem que o próprio admin
        // apagou continuava contada aqui para sempre — a política de RLS de
        // admin deixa a linha apagada visível para esta contagem sem filtro.
        supabase
          .from('travel_history')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user!.id)
          .is('deleted_at', null),
        supabase
          .from('shared_itineraries')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user!.id)
          .is('deleted_at', null),
        supabase
          .from('itinerary_likes')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user!.id),
      ]);

      if (trips.error) throw trips.error;
      if (shared.error) throw shared.error;
      if (likes.error) throw likes.error;

      return {
        trips: trips.count ?? 0,
        shared: shared.count ?? 0,
        likes: likes.count ?? 0,
      };
    },
    enabled: !!user,
    initialData: { trips: 0, shared: 0, likes: 0 },
  });
}

/**
 * Data de nascimento vive em `dtnascimento`, não em `profiles` — de propósito
 * (ver comentário na migration 20260916150000: `profiles` é legível por
 * qualquer usuário autenticado, então manter a data ali a expunha para todo
 * mundo). Este hook lê a linha do PRÓPRIO usuário.
 */
export function useMyBirthDate() {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.myBirthDate(user?.id ?? ''),
    queryFn: async (): Promise<string | null> => {
      const { data, error } = await supabase
        .from('dtnascimento')
        .select('birth_date')
        .eq('user_id', user!.id)
        .maybeSingle();

      if (error) throw error;
      return data?.birth_date ?? null;
    },
    enabled: !!user,
  });
}

export function useUpdateMyBirthDate() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (birthDate: string) => {
      // upsert: cobre tanto quem nunca teve linha em dtnascimento (conta
      // antiga, ou login via Google, que não pede data de nascimento) quanto
      // quem está corrigindo um valor já salvo.
      const { error } = await supabase
        .from('dtnascimento')
        .upsert({ user_id: user!.id, birth_date: birthDate });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.myBirthDate(user?.id ?? '') });
    },
  });
}

export function useUpdateProfile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { displayName: string; avatarUrl: string }) => {
      const { error } = await supabase.from('profiles').upsert({
        id: user!.id,
        display_name: input.displayName.trim() || null,
        avatar_url: input.avatarUrl.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.profile(user?.id ?? '') });
    },
  });
}
