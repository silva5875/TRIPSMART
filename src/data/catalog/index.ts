import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { AccommodationDetail, TouristSpot, TravelState } from '@/types/travel';
import type { RichItinerary } from '@/types/richItinerary';
import { throwFunctionError } from '@/data/functionsError';
import { queryKeys } from '@/data/queryKeys';

/**
 * Chamadas ao workflow n8n, via edge function `n8n-webhook`.
 *
 * Os payloads abaixo reproduzem exatamente o que o n8n já recebia. Repare que
 * `get-tourist-spots`/`get-accommodations` mandam o SLUG em `city`, enquanto
 * `generate-itinerary` manda o NOME. É inconsistente, mas o workflow do n8n
 * depende disso — mudar aqui exige mudar lá junto.
 */

async function invokeN8n<T>(action: string, params: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('n8n-webhook', {
    body: { action, params },
  });

  if (error) await throwFunctionError(error);
  if (!data?.success) throw new Error(data?.error ?? `Falha na ação ${action}`);
  return data.data as T;
}

export interface CatalogContext {
  cityId: string;
  cityName: string;
  budget: number;
  budgetLabel: string;
  people: number;
  days: number;
  month: number | null;
  transportToDestination: string | null;
}

const contextPayload = (ctx: CatalogContext) => ({
  city: ctx.cityId,
  cityName: ctx.cityName,
  budget: ctx.budget,
  budgetLabel: ctx.budgetLabel,
  people: ctx.people,
  days: ctx.days,
  month: ctx.month,
  transportToDestination: ctx.transportToDestination,
});

export function useTouristSpots(ctx: CatalogContext | null) {
  return useQuery({
    queryKey: queryKeys.touristSpots(ctx?.cityId ?? '', JSON.stringify(ctx ?? {})),
    queryFn: async () => {
      const spots = await invokeN8n<TouristSpot[]>('get-tourist-spots', contextPayload(ctx!));
      return Array.isArray(spots) ? spots : [];
    },
    enabled: !!ctx?.cityId,
  });
}

export function useAccommodations(ctx: CatalogContext | null, selectedSpots: TouristSpot[]) {
  return useQuery({
    queryKey: queryKeys.accommodations(
      ctx?.cityId ?? '',
      JSON.stringify({ ctx, spots: selectedSpots.map((s) => s.id) })
    ),
    queryFn: async () => {
      const accommodations = await invokeN8n<AccommodationDetail[]>('get-accommodations', {
        ...contextPayload(ctx!),
        spots: selectedSpots.map((s) => ({
          name: s.name,
          lat: s.lat,
          lng: s.lng,
          category: s.category,
        })),
      });
      return Array.isArray(accommodations) ? accommodations : [];
    },
    enabled: !!ctx?.cityId,
  });
}

export interface RichItineraryRequest {
  cityName: string;
  cityId: string;
  days: number;
  month: number;
  budget: number;
  budgetLabel: string;
  people: number;
  groupType: string;
}

/** Edge function própria (gera o roteiro editorial via IA), separada do n8n. */
export async function generateRichItinerary(input: RichItineraryRequest): Promise<RichItinerary> {
  const { data, error } = await supabase.functions.invoke('generate-rich-itinerary', {
    body: input,
  });

  if (error) await throwFunctionError(error);
  if (!data?.success) throw new Error(data?.error ?? 'Falha ao gerar roteiro');
  return data.data as RichItinerary;
}

export async function generateItinerary(
  data: TravelState,
  preferences: unknown | null
): Promise<RichItinerary> {
  const result = await invokeN8n<RichItinerary | RichItinerary[]>('generate-itinerary', {
    budget: data.budget,
    budgetLabel: data.budgetLabel,
    people: data.people,
    adults: data.adults,
    children: data.children,
    isCouple: data.isCouple,
    rooms: data.rooms,
    days: data.days,
    month: data.month,
    transportToDestination: data.transportToDestination,
    city: data.cityName,
    selectedSpots: data.selectedSpots.map((s) => ({
      name: s.name,
      category: s.category,
      lat: s.lat,
      lng: s.lng,
    })),
    accommodation: data.accommodation
      ? {
          name: data.accommodation.name,
          lat: data.accommodation.lat,
          lng: data.accommodation.lng,
        }
      : null,
    localTransport: data.localTransport,
    // Novo: o n8n pode ignorar sem quebrar, mas é por aqui que a
    // personalização entra quando o workflow for atualizado.
    preferences,
  });

  const itinerary = Array.isArray(result) ? result[0] : result;
  // O tipo declarado (Promise<RichItinerary>) não é opcional, mas um array
  // vazio do n8n (sucesso, sem roteiro para a combinação pedida) fazia esta
  // função devolver `undefined` mesmo assim — quem confiasse no tipo sem
  // checar a verdade em runtime acessaria propriedade de undefined.
  if (!itinerary) throw new Error('O n8n não devolveu nenhum roteiro para esses parâmetros');
  return itinerary;
}
