import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { queryKeys } from '@/data/queryKeys';
import { throwFunctionError } from '@/data/functionsError';

export interface PlanDTO {
  id: string;
  name: string;
  priceCents: number;
  itineraryLimitPerMonth: number;
  tagline: string | null;
  displayOrder: number;
}

/** Catálogo de planos ativos, do mais barato ao mais caro. Não exige login —
 * é a lista de preços pública da página `/planos`. */
export function usePlans() {
  return useQuery({
    queryKey: queryKeys.plans,
    queryFn: async (): Promise<PlanDTO[]> => {
      const { data, error } = await supabase
        .from('plans')
        .select('id, name, price_cents, itinerary_limit_per_month, tagline, display_order')
        .order('display_order', { ascending: true });
      if (error) throw error;
      return (data ?? []).map((p) => ({
        id: p.id,
        name: p.name,
        priceCents: p.price_cents,
        itineraryLimitPerMonth: p.itinerary_limit_per_month,
        tagline: p.tagline,
        displayOrder: p.display_order,
      }));
    },
  });
}

export interface ItineraryQuotaDTO {
  planId: string;
  planName: string;
  limitPerMonth: number;
  usedThisMonth: number;
  remaining: number;
}

/** Cota do próprio usuário logado — quantos roteiros já usou este mês e
 * quantos ainda pode gerar no plano atual. */
export function useMyQuota() {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.myItineraryQuota(user?.id ?? ''),
    queryFn: async (): Promise<ItineraryQuotaDTO> => {
      const { data, error } = await supabase.rpc('get_my_itinerary_quota');
      if (error) throw error;
      const row = data![0];
      return {
        planId: row.plan_id,
        planName: row.plan_name,
        limitPerMonth: row.limit_per_month,
        usedThisMonth: row.used_this_month,
        remaining: row.remaining,
      };
    },
    enabled: !!user,
  });
}

/**
 * Grava o interesse num plano pago. Não é mais usado no CTA da página de
 * planos (substituído por `useStartCheckout`, que cobra de verdade), mas
 * fica disponível — é dado útil (quem quis assinar antes de existir
 * cobrança) e não faz mal manter.
 */
export function useSubmitPlanInterest() {
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (planId: string) => {
      const { error } = await supabase.from('plan_interest').insert({ user_id: user!.id, plan_id: planId });
      if (error) throw error;
    },
  });
}

/** Cria uma sessão do Stripe Checkout pro plano escolhido e devolve a URL —
 * quem chama é responsável por redirecionar (`window.location.href = url`). */
export function useStartCheckout() {
  return useMutation({
    mutationFn: async (planId: 'mochileiro' | 'explorador'): Promise<string> => {
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: { planId },
      });
      if (error) await throwFunctionError(error);
      if (!data?.success) throw new Error(data?.error ?? 'Não foi possível iniciar o checkout');
      return data.data.url as string;
    },
  });
}

/** Cria uma sessão do Customer Portal do Stripe (upgrade/downgrade/
 * cancelamento, tudo hospedado pelo próprio Stripe) e devolve a URL. */
export function useManageSubscription() {
  return useMutation({
    mutationFn: async (): Promise<string> => {
      const { data, error } = await supabase.functions.invoke('create-portal-session');
      if (error) await throwFunctionError(error);
      if (!data?.success) throw new Error(data?.error ?? 'Não foi possível abrir o gerenciamento da assinatura');
      return data.data.url as string;
    },
  });
}
