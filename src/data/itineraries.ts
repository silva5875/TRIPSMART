import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toJson } from '@/integrations/supabase/database';
import type { RichItinerary } from '@/types/richItinerary';
import type { TouristSpot, TravelState } from '@/types/travel';
import { queryKeys } from './queryKeys';

export const FEED_PAGE_SIZE = 20;

/**
 * Colunas explícitas de propósito: `shared_itineraries` guarda `itinerary_data`
 * e `map_data` (o roteiro rico inteiro). Um `select('*')` aqui baixava esse
 * blob para CADA card do feed.
 */
const FEED_COLUMNS =
  'id, user_id, title, description, city, city_name, days, people, month, budget_label, selected_spots, rating_avg, rating_count, likes_count, created_at';

export interface FeedItinerary {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  city: string;
  city_name: string;
  days: number;
  people: number;
  month: number | null;
  budget_label: string;
  selected_spots: TouristSpot[];
  rating_avg: number;
  rating_count: number;
  likes_count: number;
  created_at: string;
  profile: { display_name: string | null; avatar_url: string | null } | null;
}

/** Exportado: reaproveitado pelas listagens administrativas em `admin.ts`. */
export async function attachProfiles<T extends { user_id: string }>(
  rows: T[],
  columns = 'id, display_name, avatar_url'
): Promise<(T & { profile: { display_name: string | null; avatar_url: string | null } | null })[]> {
  const userIds = [...new Set(rows.map((r) => r.user_id))];
  if (userIds.length === 0) return rows.map((r) => ({ ...r, profile: null }));

  const { data, error } = await supabase.from('profiles').select(columns).in('id', userIds);
  if (error) throw error;

  const byId = new Map(
    ((data ?? []) as unknown as { id: string; display_name: string | null; avatar_url?: string | null }[]).map(
      (p) => [p.id, { display_name: p.display_name, avatar_url: p.avatar_url ?? null }]
    )
  );

  return rows.map((r) => ({ ...r, profile: byId.get(r.user_id) ?? null }));
}

export function useCommunityFeed() {
  return useQuery({
    queryKey: queryKeys.communityFeed,
    queryFn: async (): Promise<FeedItinerary[]> => {
      // `deleted_at` explícito: o RLS esconde os apagados do usuário comum, mas
      // a política do admin é mais ampla e traria roteiros removidos no feed.
      const { data, error } = await supabase
        .from('shared_itineraries')
        .select(FEED_COLUMNS)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .range(0, FEED_PAGE_SIZE - 1);

      if (error) throw error;
      return attachProfiles((data ?? []) as unknown as Omit<FeedItinerary, 'profile'>[]);
    },
  });
}

export interface MyReactions {
  likes: Record<string, boolean>;
  saves: Record<string, boolean>;
  ratings: Record<string, number>;
}

export function useMyReactions() {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.myItineraryReactions(user?.id ?? ''),
    queryFn: async (): Promise<MyReactions> => {
      const [likes, saves, ratings] = await Promise.all([
        supabase.from('itinerary_likes').select('itinerary_id').eq('user_id', user!.id),
        supabase.from('saved_itineraries').select('itinerary_id').eq('user_id', user!.id),
        supabase.from('itinerary_ratings').select('itinerary_id, score').eq('user_id', user!.id),
      ]);

      if (likes.error) throw likes.error;
      if (saves.error) throw saves.error;
      if (ratings.error) throw ratings.error;

      return {
        likes: Object.fromEntries((likes.data ?? []).map((l) => [l.itinerary_id, true])),
        saves: Object.fromEntries((saves.data ?? []).map((s) => [s.itinerary_id, true])),
        ratings: Object.fromEntries((ratings.data ?? []).map((r) => [r.itinerary_id, r.score])),
      };
    },
    enabled: !!user,
    initialData: { likes: {}, saves: {}, ratings: {} },
  });
}

/**
 * Atualiza o cache otimisticamente e reverte no erro. Sem isso a UI mostrava
 * "curtido" para sempre quando o insert falhava (RLS, offline, unique).
 */
function useReactionMutation<TVars>(
  mutationFn: (vars: TVars) => Promise<void>,
  applyOptimistic: (current: MyReactions, vars: TVars) => MyReactions,
  options?: { alsoInvalidateFeed?: boolean }
) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const key = queryKeys.myItineraryReactions(user?.id ?? '');

  return useMutation({
    mutationFn,
    onMutate: async (vars: TVars) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<MyReactions>(key);
      if (previous) queryClient.setQueryData(key, applyOptimistic(previous, vars));
      return { previous };
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: key });
      if (options?.alsoInvalidateFeed) {
        queryClient.invalidateQueries({ queryKey: queryKeys.communityFeed });
      }
    },
  });
}

export function useToggleLike() {
  const { user } = useAuth();

  return useReactionMutation<{ itineraryId: string; liked: boolean }>(
    async ({ itineraryId, liked }) => {
      const { error } = liked
        ? await supabase
            .from('itinerary_likes')
            .delete()
            .eq('user_id', user!.id)
            .eq('itinerary_id', itineraryId)
        : await supabase
            .from('itinerary_likes')
            .insert({ user_id: user!.id, itinerary_id: itineraryId });
      if (error) throw error;
    },
    (current, { itineraryId, liked }) => ({
      ...current,
      likes: { ...current.likes, [itineraryId]: !liked },
    }),
    // likes_count é recalculado por trigger no banco.
    { alsoInvalidateFeed: true }
  );
}

export function useToggleSave() {
  const { user } = useAuth();

  return useReactionMutation<{ itineraryId: string; saved: boolean }>(
    async ({ itineraryId, saved }) => {
      const { error } = saved
        ? await supabase
            .from('saved_itineraries')
            .delete()
            .eq('user_id', user!.id)
            .eq('itinerary_id', itineraryId)
        : await supabase
            .from('saved_itineraries')
            .insert({ user_id: user!.id, itinerary_id: itineraryId });
      if (error) throw error;
    },
    (current, { itineraryId, saved }) => ({
      ...current,
      saves: { ...current.saves, [itineraryId]: !saved },
    })
  );
}

export function useRateItinerary() {
  const { user } = useAuth();

  return useReactionMutation<{ itineraryId: string; score: number }>(
    async ({ itineraryId, score }) => {
      // upsert em vez de decidir update/insert pelo state local, que podia
      // estar dessincronizado e gerar violação do unique (user_id, itinerary_id).
      const { error } = await supabase
        .from('itinerary_ratings')
        .upsert(
          { user_id: user!.id, itinerary_id: itineraryId, score },
          { onConflict: 'user_id,itinerary_id' }
        );
      if (error) throw error;
    },
    (current, { itineraryId, score }) => ({
      ...current,
      ratings: { ...current.ratings, [itineraryId]: score },
    }),
    // rating_avg é recalculado por trigger no banco.
    { alsoInvalidateFeed: true }
  );
}

export interface ItineraryComment {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  profile: { display_name: string | null; avatar_url: string | null } | null;
}

export function useComments(itineraryId: string, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.communityComments(itineraryId),
    queryFn: async (): Promise<ItineraryComment[]> => {
      const { data, error } = await supabase
        .from('itinerary_comments')
        .select('id, user_id, content, created_at')
        .eq('itinerary_id', itineraryId)
        .is('deleted_at', null)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return attachProfiles((data ?? []) as Omit<ItineraryComment, 'profile'>[]);
    },
    enabled,
  });
}

export function usePostComment() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ itineraryId, content }: { itineraryId: string; content: string }) => {
      const { error } = await supabase
        .from('itinerary_comments')
        .insert({ user_id: user!.id, itinerary_id: itineraryId, content });
      if (error) throw error;
      return itineraryId;
    },
    onSuccess: (itineraryId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.communityComments(itineraryId) });
    },
  });
}

export async function shareItinerary(
  userId: string,
  data: TravelState,
  richItinerary: RichItinerary | null
) {
  const people = `${data.adults} adulto${data.adults > 1 ? 's' : ''}${
    data.children > 0 ? ` + ${data.children} criança${data.children > 1 ? 's' : ''}` : ''
  }`;
  const rooms = `${data.rooms} quarto${data.rooms > 1 ? 's' : ''}`;

  const { error } = await supabase.from('shared_itineraries').insert({
    user_id: userId,
    title: `${data.days} dias em ${data.cityName}`,
    description: `Roteiro de ${data.days} dias em ${data.cityName}, PE · ${people} · ${rooms}${
      data.isCouple ? ' · Casal' : ''
    } · ${data.selectedSpots.length} atividades.`,
    budget: data.budget,
    budget_label: data.budgetLabel,
    people: data.people,
    days: data.days,
    group_type: data.groupType,
    month: data.month,
    transport_to_destination: data.transportToDestination,
    city: data.city,
    city_name: data.cityName,
    selected_spots: toJson(data.selectedSpots),
    accommodation: toJson(data.accommodation),
    local_transport: data.localTransport,
    itinerary_data: toJson(richItinerary),
  });

  if (error) throw error;
}
