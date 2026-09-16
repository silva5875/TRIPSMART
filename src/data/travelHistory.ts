import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { TouristSpot, TravelState } from '@/types/travel';
import { pernambucoCities } from '@/data/mockData';
import { toJson } from '@/integrations/supabase/database';
import { queryKeys } from './queryKeys';

export interface TravelRecord {
  id: string;
  protocol_number: number;
  budget: number;
  people: number;
  group_type: string;
  country: string;
  state: string;
  city_id: string | null;
  days: number | null;
  month: number | null;
  entertainment: string[];
  food: string[];
  accommodation: string | null;
  local_transport: string | null;
  transport_to_destination: string | null;
  tourist_spots: TouristSpot[] | null;
  restaurants: unknown[] | null;
  created_at: string;
  deleted_at: string | null;
  deleted_by: string | null;
}

/**
 * Slug canônico da cidade de um registro.
 *
 * `city_id` só existe a partir da migration 20260915120100. Para registros
 * antigos, deriva do `state` ("Porto de Galinhas, PE"). É essa chave — e nunca
 * o `state` cru — que deve ser usada para ler e gravar avaliações.
 */
export function cityIdOf(record: Pick<TravelRecord, 'city_id' | 'state'>): string | null {
  if (record.city_id) return record.city_id;

  const cityName = record.state.split(',')[0].trim().toLowerCase();
  return pernambucoCities.find((c) => c.name.toLowerCase() === cityName)?.id ?? null;
}

export async function fetchTravelHistory(userId: string): Promise<TravelRecord[]> {
  // O filtro de `deleted_at` é explícito de propósito. O RLS já esconde os
  // apagados do usuário comum, mas a política do admin é mais ampla — sem este
  // filtro, um admin veria as viagens de todo mundo no próprio histórico.
  const { data, error } = await supabase
    .from('travel_history')
    .select('*')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as TravelRecord[];
}

export function useTravelHistory() {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.travelHistory(user?.id ?? ''),
    queryFn: () => fetchTravelHistory(user!.id),
    enabled: !!user,
  });
}

export function buildTravelHistoryInsert(userId: string, data: TravelState) {
  return {
    user_id: userId,
    budget: data.budget,
    people: data.people,
    days: data.days,
    group_type: data.groupType,
    country: 'Brasil',
    state: `${data.cityName}, PE`,
    city_id: data.city,
    entertainment: data.selectedSpots.map((s) => s.name),
    food: [],
    accommodation: data.accommodation?.name ?? null,
    month: data.month,
    transport_to_destination: data.transportToDestination,
    tourist_spots: toJson(data.selectedSpots),
    local_transport: data.localTransport,
  };
}

/**
 * PostgREST devolve PGRST204 ("Could not find the 'x' column ... in the schema
 * cache") quando o código está à frente do banco. A mensagem crua não diz o que
 * fazer, então traduzimos para a ação concreta.
 */
const SCHEMA_CACHE_ERROR = 'PGRST204';

export interface SavedTravelRecord {
  protocolNumber: number;
  createdAt: string;
}

/**
 * `protocol_number` nunca é enviado no insert — é gerado pelo DEFAULT da
 * coluna (uma sequence no banco). O `.select()` aqui é só para ler de volta o
 * valor que o banco atribuiu, para mostrar na hora ao usuário.
 */
export async function saveTravelRecord(userId: string, data: TravelState): Promise<SavedTravelRecord> {
  const { data: inserted, error } = await supabase
    .from('travel_history')
    .insert(buildTravelHistoryInsert(userId, data))
    .select('protocol_number, created_at')
    .single();

  if (error) {
    if (error.code === SCHEMA_CACHE_ERROR) {
      throw new Error(
        'O banco ainda não tem as colunas desta versão do app. Aplique as migrations ' +
          'de supabase/migrations/ (20260915120000 → 120100 → 120200) no painel do Supabase. ' +
          `Detalhe: ${error.message}`
      );
    }
    throw error;
  }

  return { protocolNumber: inserted.protocol_number, createdAt: inserted.created_at };
}

/**
 * Soft delete: marca a viagem como apagada em vez de remover a linha.
 * Ela some para o usuário e continua acessível no painel administrativo.
 */
export function useDeleteTravelRecord() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('travel_history')
        .update({ deleted_at: new Date().toISOString(), deleted_by: user!.id })
        .eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.travelHistory(user?.id ?? '') });
    },
  });
}
