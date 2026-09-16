import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type {
  AdminDayTrafficDetail, AdminTopPage, AdminTopReferrer, AdminTrafficDay, AdminTrafficOverview,
} from '@/integrations/supabase/database';
import { queryKeys } from './queryKeys';

const VISITOR_ID_KEY = 'tripsmart_visitor_id';
const SESSION_ID_KEY = 'tripsmart_session_id';

function randomId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  // Fallback para navegadores sem crypto.randomUUID (contexto não seguro, muito antigo).
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * `visitor_id` (localStorage, persiste entre visitas) e `session_id`
 * (sessionStorage, some quando a aba fecha) são gerados no navegador e nunca
 * carregam nada que identifique a pessoa — só permitem contar "quantos
 * dispositivos distintos" e "quantas idas ao site", nada além disso.
 */
function getOrCreateId(storage: Storage, key: string): string {
  try {
    const existing = storage.getItem(key);
    if (existing) return existing;
    const id = randomId();
    storage.setItem(key, id);
    return id;
  } catch {
    // Storage bloqueado (modo privado, cookies desativados): usa um id
    // efêmero só desta chamada, sem persistir.
    return randomId();
  }
}

/** Só o host do referrer (ex. "google.com"), nunca a URL inteira — evita
 * capturar querystring de terceiros, que às vezes carrega dado sensível. */
function referrerHostOf(referrer: string): string | null {
  if (!referrer) return null;
  try {
    const url = new URL(referrer);
    return url.origin === window.location.origin ? null : url.hostname;
  } catch {
    return null;
  }
}

export interface TrackPageViewInput {
  path: string;
  /** Passe quando a pessoa estiver logada; correlaciona sem que a página vire obrigatória. */
  userId?: string | null;
}

/**
 * Registra uma visualização de página. Nunca lança: uma falha de rede ou de
 * schema aqui não pode quebrar a navegação nem virar um toast de erro para
 * quem só está passando pelo site — na pior hipótese, perdemos um evento.
 */
export async function trackPageView({ path, userId }: TrackPageViewInput): Promise<void> {
  try {
    const { error } = await supabase.from('page_views').insert({
      path,
      referrer_host: referrerHostOf(document.referrer),
      visitor_id: getOrCreateId(localStorage, VISITOR_ID_KEY),
      session_id: getOrCreateId(sessionStorage, SESSION_ID_KEY),
      user_id: userId ?? null,
      device_type: window.innerWidth < 768 ? 'mobile' : 'desktop',
    });
    if (error) throw error;
  } catch (error) {
    console.warn('[analytics] falha ao registrar pageview', error);
  }
}

// ============================================================
// Leitura (admin)
// ============================================================

export function useAdminTrafficOverview(daysBack = 30) {
  return useQuery({
    queryKey: queryKeys.adminTrafficOverview(daysBack),
    queryFn: async (): Promise<AdminTrafficOverview> => {
      const { data, error } = await supabase.rpc('admin_traffic_overview', { days_back: daysBack });
      if (error) throw error;
      return data![0];
    },
  });
}

export function useAdminTrafficSeries(daysBack = 30) {
  return useQuery({
    queryKey: queryKeys.adminTrafficSeries(daysBack),
    queryFn: async (): Promise<AdminTrafficDay[]> => {
      const { data, error } = await supabase.rpc('admin_traffic_series', { days_back: daysBack });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAdminTopPages(daysBack = 30, limit = 10) {
  return useQuery({
    queryKey: queryKeys.adminTopPages(daysBack, limit),
    queryFn: async (): Promise<AdminTopPage[]> => {
      const { data, error } = await supabase.rpc('admin_top_pages', {
        days_back: daysBack,
        limit_count: limit,
      });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAdminTopReferrers(daysBack = 30, limit = 10) {
  return useQuery({
    queryKey: queryKeys.adminTopReferrers(daysBack, limit),
    queryFn: async (): Promise<AdminTopReferrer[]> => {
      const { data, error } = await supabase.rpc('admin_top_referrers', {
        days_back: daysBack,
        limit_count: limit,
      });
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Detalhe de um dia específico — clique numa barra do gráfico "Fluxo de
 * pessoas". `day` no formato YYYY-MM-DD. */
export function useAdminDayTraffic(day: string | null) {
  return useQuery({
    queryKey: queryKeys.adminDayTraffic(day ?? ''),
    queryFn: async (): Promise<AdminDayTrafficDetail> => {
      const { data, error } = await supabase.rpc('admin_day_traffic_detail', { target_day: day! });
      if (error) throw error;
      return data![0] ?? { pageviews: 0, unique_visitors: 0, top_pages: [], top_referrers: [] };
    },
    enabled: !!day,
  });
}
