import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { queryKeys } from '@/data/queryKeys';

export interface RatingAverage {
  avg: number;
  count: number;
}

export type RatingAverages = Record<string, RatingAverage>;

/**
 * `cityId` é SEMPRE o slug da cidade (`"porto-galinhas"`), nunca o rótulo
 * (`"Porto de Galinhas, PE"`). Antes da migration 20260915120000 os dois
 * formatos conviviam e as avaliações nunca se encontravam.
 */
function averageByKey<T extends { score: number }>(
  rows: T[],
  keyOf: (row: T) => string
): RatingAverages {
  const scores: Record<string, number[]> = {};
  for (const row of rows) {
    const key = keyOf(row);
    (scores[key] ??= []).push(row.score);
  }

  const averages: RatingAverages = {};
  for (const [key, values] of Object.entries(scores)) {
    averages[key] = {
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      count: values.length,
    };
  }
  return averages;
}

export async function fetchActivityRatingAverages(cityId: string): Promise<RatingAverages> {
  const { data, error } = await supabase
    .from('activity_reviews')
    .select('activity_name, score')
    .eq('city_id', cityId);

  if (error) throw error;
  return averageByKey(data ?? [], (r) => r.activity_name);
}

export async function fetchAccommodationRatingAverages(cityId: string): Promise<RatingAverages> {
  const { data, error } = await supabase
    .from('accommodation_reviews')
    .select('accommodation_name, score')
    .eq('city_id', cityId);

  if (error) throw error;
  return averageByKey(data ?? [], (r) => r.accommodation_name);
}

export function useActivityRatingAverages(cityId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.activityRatings(cityId ?? ''),
    queryFn: () => fetchActivityRatingAverages(cityId!),
    enabled: !!cityId,
    initialData: {} as RatingAverages,
  });
}

export function useAccommodationRatingAverages(cityId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.accommodationRatings(cityId ?? ''),
    queryFn: () => fetchAccommodationRatingAverages(cityId!),
    enabled: !!cityId,
    initialData: {} as RatingAverages,
  });
}

/** Notas que o próprio usuário já deu, por nome do item. */
export function useMyActivityReviews(cityId: string | null | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.myActivityReviews(user?.id ?? '', cityId ?? ''),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activity_reviews')
        .select('activity_name, score')
        .eq('user_id', user!.id)
        .eq('city_id', cityId!);

      if (error) throw error;
      return Object.fromEntries((data ?? []).map((r) => [r.activity_name, r.score]));
    },
    enabled: !!user && !!cityId,
    initialData: {} as Record<string, number>,
  });
}

export function useMyAccommodationReviews(cityId: string | null | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.myAccommodationReviews(user?.id ?? '', cityId ?? ''),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('accommodation_reviews')
        .select('accommodation_name, score')
        .eq('user_id', user!.id)
        .eq('city_id', cityId!);

      if (error) throw error;
      return Object.fromEntries((data ?? []).map((r) => [r.accommodation_name, r.score]));
    },
    enabled: !!user && !!cityId,
    initialData: {} as Record<string, number>,
  });
}

export interface ActivityReviewInput {
  activityName: string;
  cityId: string;
  score: number;
  comment?: string | null;
  /** Alimenta `favorite_categories` em user_preferences — sempre envie quando souber. */
  category?: string | null;
}

export function useUpsertActivityReview() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ActivityReviewInput) => {
      const { error } = await supabase.from('activity_reviews').upsert(
        {
          user_id: user!.id,
          activity_name: input.activityName,
          city_id: input.cityId,
          score: input.score,
          comment: input.comment ?? null,
          category: input.category ?? null,
        },
        { onConflict: 'user_id,activity_name,city_id' }
      );
      if (error) throw error;
      return input;
    },
    onSuccess: (input) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.activityRatings(input.cityId) });
      queryClient.invalidateQueries({
        queryKey: queryKeys.myActivityReviews(user?.id ?? '', input.cityId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.preferences(user?.id ?? '') });
    },
  });
}

export interface AccommodationReviewInput {
  accommodationName: string;
  cityId: string;
  score: number;
  comment?: string | null;
}

export function useUpsertAccommodationReview() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: AccommodationReviewInput) => {
      const { error } = await supabase.from('accommodation_reviews').upsert(
        {
          user_id: user!.id,
          accommodation_name: input.accommodationName,
          city_id: input.cityId,
          score: input.score,
          comment: input.comment ?? null,
        },
        { onConflict: 'user_id,accommodation_name,city_id' }
      );
      if (error) throw error;
      return input;
    },
    onSuccess: (input) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accommodationRatings(input.cityId) });
      queryClient.invalidateQueries({
        queryKey: queryKeys.myAccommodationReviews(user?.id ?? '', input.cityId),
      });
    },
  });
}
