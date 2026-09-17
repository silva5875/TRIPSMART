import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { budgetLabel } from '@/lib/format';
import type {
  AdminActivityDay, AdminOverviewCounts, AdminUserRow, AppRole,
} from '@/integrations/supabase/database';
import { throwFunctionError } from '@/data/functionsError';
import { attachProfiles } from '@/data/itineraries';
import type { PlannerStepName } from '@/data/plannerProgress';
import { queryKeys } from '@/data/queryKeys';

/**
 * Tamanho das listagens administrativas por trás dos cartões de "Atividade
 * gerada no site" — não precisam de paginação de verdade, só de um teto.
 * 200 (não 50): o clique num dia específico do gráfico de atividade filtra
 * esta mesma lista por data — um teto pequeno demais deixaria de fora dias
 * mais antigos dentro da janela de 30 dias assim que o total passasse dele.
 */
const ADMIN_DRILLDOWN_LIMIT = 200;

/** Tabelas com soft delete (migration 20260916100000). */
export type SoftDeletableEntity =
  | 'travel_history'
  | 'shared_itineraries'
  | 'itinerary_comments';

export const ENTITY_LABELS: Record<SoftDeletableEntity, string> = {
  travel_history: 'Viagem',
  shared_itineraries: 'Roteiro compartilhado',
  itinerary_comments: 'Comentário',
};

/** Forma comum para listar itens apagados de tabelas diferentes na mesma tela. */
export interface DeletedRecordDTO {
  id: string;
  entity: SoftDeletableEntity;
  title: string;
  detail: string;
  userId: string;
  createdAt: string;
  deletedAt: string;
  deletedBy: string | null;
  /** true quando quem apagou não foi o dono — ou seja, foi moderação. */
  removedByModeration: boolean;
}

/**
 * Se o usuário atual é admin. Vai pela função do banco em vez de ler
 * `user_roles` direto: a função é a mesma usada pelas regras de acesso, então
 * tela e banco nunca discordam.
 */
export function useIsAdmin() {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.isAdmin(user?.id ?? ''),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('is_admin');
      if (error) throw error;
      return data === true;
    },
    enabled: !!user,
    initialData: false,
  });
}

export function useDeletedRecords(options?: { enabled?: boolean }) {
  return useQuery({
    enabled: options?.enabled ?? true,
    queryKey: queryKeys.deletedRecords,
    queryFn: async (): Promise<DeletedRecordDTO[]> => {
      const [viagens, roteiros, comentarios] = await Promise.all([
        supabase
          .from('travel_history')
          .select('id, user_id, state, budget, people, created_at, deleted_at, deleted_by')
          .not('deleted_at', 'is', null)
          .order('deleted_at', { ascending: false }),
        supabase
          .from('shared_itineraries')
          .select('id, user_id, title, city_name, days, created_at, deleted_at, deleted_by')
          .not('deleted_at', 'is', null)
          .order('deleted_at', { ascending: false }),
        supabase
          .from('itinerary_comments')
          .select('id, user_id, content, created_at, deleted_at, deleted_by')
          .not('deleted_at', 'is', null)
          .order('deleted_at', { ascending: false }),
      ]);

      if (viagens.error) throw viagens.error;
      if (roteiros.error) throw roteiros.error;
      if (comentarios.error) throw comentarios.error;

      const registros: DeletedRecordDTO[] = [
        ...(viagens.data ?? []).map((r) => ({
          id: r.id,
          entity: 'travel_history' as const,
          title: r.state,
          detail: `${r.people} pessoa${r.people > 1 ? 's' : ''} · ${budgetLabel(Number(r.budget))}`,
          userId: r.user_id,
          createdAt: r.created_at,
          deletedAt: r.deleted_at!,
          deletedBy: r.deleted_by,
          removedByModeration: !!r.deleted_by && r.deleted_by !== r.user_id,
        })),
        ...(roteiros.data ?? []).map((r) => ({
          id: r.id,
          entity: 'shared_itineraries' as const,
          title: r.title,
          detail: `${r.city_name} · ${r.days} dia${r.days > 1 ? 's' : ''}`,
          userId: r.user_id,
          createdAt: r.created_at,
          deletedAt: r.deleted_at!,
          deletedBy: r.deleted_by,
          removedByModeration: !!r.deleted_by && r.deleted_by !== r.user_id,
        })),
        ...(comentarios.data ?? []).map((r) => ({
          id: r.id,
          entity: 'itinerary_comments' as const,
          title: r.content.slice(0, 80),
          detail: 'Comentário na comunidade',
          userId: r.user_id,
          createdAt: r.created_at,
          deletedAt: r.deleted_at!,
          deletedBy: r.deleted_by,
          removedByModeration: !!r.deleted_by && r.deleted_by !== r.user_id,
        })),
      ];

      return registros.sort((a, b) => b.deletedAt.localeCompare(a.deletedAt));
    },
  });
}

export function useRestoreRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ entity, id }: { entity: SoftDeletableEntity; id: string }) => {
      const { error } = await supabase
        .from(entity)
        .update({ deleted_at: null, deleted_by: null })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      // Restaurar reabilita o registro em todas as listagens do app.
      queryClient.invalidateQueries();
    },
  });
}

// ============================================================
// Visão geral (dashboard)
// ============================================================

/**
 * "Fluxo de pessoas" aqui é atividade já registrada no banco — cadastros,
 * viagens salvas, roteiros compartilhados, por dia — não pageviews de
 * visitante anônimo. O app não rastreia isso hoje; seria uma peça de
 * infraestrutura nova (tabela de eventos + disparo em cada página).
 */
export function useAdminOverview() {
  return useQuery({
    queryKey: queryKeys.adminOverview,
    queryFn: async (): Promise<AdminOverviewCounts> => {
      const { data, error } = await supabase.rpc('admin_overview_counts');
      if (error) throw error;
      return data![0];
    },
  });
}

export function useAdminActivitySeries(daysBack = 30) {
  return useQuery({
    queryKey: queryKeys.adminActivitySeries(daysBack),
    queryFn: async (): Promise<AdminActivityDay[]> => {
      const { data, error } = await supabase.rpc('admin_activity_series', { days_back: daysBack });
      if (error) throw error;
      return data ?? [];
    },
  });
}

// ============================================================
// Usuários
// ============================================================

/**
 * DTO de usuário para a tela administrativa — nunca o `AdminUserRow` cru que
 * `admin_list_users()` devolve. `banned_until` vira `isBanned` aqui, não na
 * tela: um único lugar decide "banido" e todo consumidor concorda.
 */
export interface AdminUserDTO {
  id: string;
  userNumber: number | null;
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  createdAt: string;
  lastSignInAt: string | null;
  isBanned: boolean;
  roles: AppRole[];
  tripsCount: number;
  sharedCount: number;
  birthDate: string | null;
  ageYears: number | null;
  ageMonths: number | null;
  ageDays: number | null;
}

function toAdminUserDTO(row: AdminUserRow): AdminUserDTO {
  return {
    id: row.id,
    userNumber: row.user_number,
    email: row.email,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    createdAt: row.created_at,
    lastSignInAt: row.last_sign_in_at,
    isBanned: !!row.banned_until && new Date(row.banned_until) > new Date(),
    roles: row.roles,
    tripsCount: row.trips_count,
    sharedCount: row.shared_count,
    birthDate: row.birth_date,
    ageYears: row.age_years,
    ageMonths: row.age_months,
    ageDays: row.age_days,
  };
}

export function useAdminUsers() {
  return useQuery({
    queryKey: queryKeys.adminUsers,
    queryFn: async (): Promise<AdminUserDTO[]> => {
      const { data, error } = await supabase.rpc('admin_list_users');
      if (error) throw error;
      return (data ?? []).map(toAdminUserDTO);
    },
  });
}

export function useSetUserRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      role,
      grant,
    }: {
      userId: string;
      role: AppRole;
      grant: boolean;
    }) => {
      const { error } = await supabase.rpc('admin_set_role', {
        target_user_id: userId,
        role_to_set: role,
        should_grant: grant,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminUsers });
    },
  });
}

export interface CreateUserInput {
  email: string;
  password: string;
  displayName: string;
  /** formato YYYY-MM-DD (o que <input type="date"> já produz). */
  birthDate: string;
  role: Extract<AppRole, 'admin' | 'user'>;
}

/**
 * Cria a conta de verdade (senha utilizável, login liberado na hora) via
 * edge function `admin-create-user`, que roda com a service role — a única
 * forma seria expor essa chave no navegador, o que nunca deve acontecer.
 * A função reconfirma `is_admin()` do lado do servidor antes de qualquer
 * coisa; o gate na tela é só conveniência.
 */
export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateUserInput) => {
      const { data, error } = await supabase.functions.invoke('admin-create-user', {
        body: {
          email: input.email,
          password: input.password,
          displayName: input.displayName,
          birthDate: input.birthDate,
          role: input.role,
        },
      });
      if (error) await throwFunctionError(error);
      if (!data?.success) throw new Error(data?.error ?? 'Falha ao criar usuário');
      return data.data as { id: string; email: string };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminUsers });
      queryClient.invalidateQueries({ queryKey: queryKeys.adminOverview });
    },
  });
}

export function useSetUserBanned() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, banned }: { userId: string; banned: boolean }) => {
      const { error } = await supabase.rpc('admin_set_user_banned', {
        target_user_id: userId,
        banned,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminUsers });
    },
  });
}

// ============================================================
// Detalhamento por trás dos cartões de "Atividade gerada no site" — cada
// consulta só roda quando o admin abre o respectivo cartão (`enabled`),
// para não disparar 5 requisições extras toda vez que o painel carrega.
// ============================================================

/** Busca os títulos de `shared_itineraries` referenciados por likes/comentários. */
async function attachItineraryTitles<T extends { itinerary_id: string }>(
  rows: T[]
): Promise<(T & { itineraryTitle: string | null })[]> {
  const ids = [...new Set(rows.map((r) => r.itinerary_id))];
  if (ids.length === 0) return rows.map((r) => ({ ...r, itineraryTitle: null }));

  const { data, error } = await supabase.from('shared_itineraries').select('id, title').in('id', ids);
  if (error) throw error;

  const byId = new Map((data ?? []).map((i) => [i.id, i.title]));
  return rows.map((r) => ({ ...r, itineraryTitle: byId.get(r.itinerary_id) ?? null }));
}

export interface AdminTravelHistoryDTO {
  id: string;
  displayName: string | null;
  state: string;
  budget: number;
  people: number;
  days: number | null;
  protocolNumber: number;
  createdAt: string;
}

/** Viagens salvas por qualquer usuário — mesma tabela de `useTravelHistory`,
 * mas sem o filtro por `user_id` (a política de admin já permite ler todas). */
export function useAdminTravelHistory(options?: { enabled?: boolean; limit?: number }) {
  const limit = options?.limit ?? ADMIN_DRILLDOWN_LIMIT;
  return useQuery({
    enabled: options?.enabled ?? true,
    queryKey: queryKeys.adminTravelHistory(limit),
    queryFn: async (): Promise<AdminTravelHistoryDTO[]> => {
      const { data, error } = await supabase
        .from('travel_history')
        .select('id, user_id, state, budget, people, days, protocol_number, created_at')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .range(0, limit - 1);
      if (error) throw error;

      const rows = await attachProfiles((data ?? []) as unknown as {
        id: string; user_id: string; state: string; budget: number; people: number;
        days: number | null; protocol_number: number; created_at: string;
      }[]);
      return rows.map((r) => ({
        id: r.id,
        displayName: r.profile?.display_name ?? null,
        state: r.state,
        budget: r.budget,
        people: r.people,
        days: r.days,
        protocolNumber: r.protocol_number,
        createdAt: r.created_at,
      }));
    },
  });
}

export interface AdminSharedItineraryDTO {
  id: string;
  displayName: string | null;
  title: string;
  cityName: string;
  days: number;
  likesCount: number;
  ratingAvg: number;
  createdAt: string;
}

export function useAdminSharedItineraries(options?: { enabled?: boolean; limit?: number }) {
  const limit = options?.limit ?? ADMIN_DRILLDOWN_LIMIT;
  return useQuery({
    enabled: options?.enabled ?? true,
    queryKey: queryKeys.adminSharedItineraries(limit),
    queryFn: async (): Promise<AdminSharedItineraryDTO[]> => {
      const { data, error } = await supabase
        .from('shared_itineraries')
        .select('id, user_id, title, city_name, days, likes_count, rating_avg, created_at')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .range(0, limit - 1);
      if (error) throw error;

      const rows = await attachProfiles((data ?? []) as unknown as {
        id: string; user_id: string; title: string; city_name: string; days: number;
        likes_count: number; rating_avg: number; created_at: string;
      }[]);
      return rows.map((r) => ({
        id: r.id,
        displayName: r.profile?.display_name ?? null,
        title: r.title,
        cityName: r.city_name,
        days: r.days,
        likesCount: r.likes_count,
        ratingAvg: r.rating_avg,
        createdAt: r.created_at,
      }));
    },
  });
}

export interface AdminCommentDTO {
  id: string;
  displayName: string | null;
  content: string;
  itineraryTitle: string | null;
  createdAt: string;
}

export function useAdminComments(options?: { enabled?: boolean; limit?: number }) {
  const limit = options?.limit ?? ADMIN_DRILLDOWN_LIMIT;
  return useQuery({
    enabled: options?.enabled ?? true,
    queryKey: queryKeys.adminComments(limit),
    queryFn: async (): Promise<AdminCommentDTO[]> => {
      const { data, error } = await supabase
        .from('itinerary_comments')
        .select('id, user_id, itinerary_id, content, created_at')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .range(0, limit - 1);
      if (error) throw error;

      const withTitles = await attachItineraryTitles((data ?? []) as unknown as {
        id: string; user_id: string; itinerary_id: string; content: string; created_at: string;
      }[]);
      const rows = await attachProfiles(withTitles);
      return rows.map((r) => ({
        id: r.id,
        displayName: r.profile?.display_name ?? null,
        content: r.content,
        itineraryTitle: r.itineraryTitle,
        createdAt: r.created_at,
      }));
    },
  });
}

export interface AdminLikeDTO {
  id: string;
  displayName: string | null;
  itineraryTitle: string | null;
  createdAt: string;
}

export function useAdminLikes(options?: { enabled?: boolean; limit?: number }) {
  const limit = options?.limit ?? ADMIN_DRILLDOWN_LIMIT;
  return useQuery({
    enabled: options?.enabled ?? true,
    queryKey: queryKeys.adminLikes(limit),
    queryFn: async (): Promise<AdminLikeDTO[]> => {
      const { data, error } = await supabase
        .from('itinerary_likes')
        .select('id, user_id, itinerary_id, created_at')
        .order('created_at', { ascending: false })
        .range(0, limit - 1);
      if (error) throw error;

      const withTitles = await attachItineraryTitles((data ?? []) as unknown as {
        id: string; user_id: string; itinerary_id: string; created_at: string;
      }[]);
      const rows = await attachProfiles(withTitles);
      return rows.map((r) => ({
        id: r.id,
        displayName: r.profile?.display_name ?? null,
        itineraryTitle: r.itineraryTitle,
        createdAt: r.created_at,
      }));
    },
  });
}

export interface AdminReviewDTO {
  id: string;
  displayName: string | null;
  kind: 'activity' | 'accommodation';
  subject: string;
  cityId: string;
  score: number;
  comment: string | null;
  createdAt: string;
}

/** Junta `activity_reviews` e `accommodation_reviews` numa lista só, mais
 * recentes primeiro — são as duas metades de "Avaliações" no cartão. */
export function useAdminReviews(options?: { enabled?: boolean; limit?: number }) {
  const limit = options?.limit ?? ADMIN_DRILLDOWN_LIMIT;
  return useQuery({
    enabled: options?.enabled ?? true,
    queryKey: queryKeys.adminReviews(limit),
    queryFn: async (): Promise<AdminReviewDTO[]> => {
      const [activities, accommodations] = await Promise.all([
        supabase
          .from('activity_reviews')
          .select('id, user_id, activity_name, city_id, score, comment, created_at')
          .order('created_at', { ascending: false })
          .range(0, limit - 1),
        supabase
          .from('accommodation_reviews')
          .select('id, user_id, accommodation_name, city_id, score, comment, created_at')
          .order('created_at', { ascending: false })
          .range(0, limit - 1),
      ]);
      if (activities.error) throw activities.error;
      if (accommodations.error) throw accommodations.error;

      const combined = [
        ...(activities.data ?? []).map((r) => ({
          id: r.id, user_id: r.user_id, kind: 'activity' as const, subject: r.activity_name,
          city_id: r.city_id, score: r.score, comment: r.comment, created_at: r.created_at,
        })),
        ...(accommodations.data ?? []).map((r) => ({
          id: r.id, user_id: r.user_id, kind: 'accommodation' as const, subject: r.accommodation_name,
          city_id: r.city_id, score: r.score, comment: r.comment, created_at: r.created_at,
        })),
      ]
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .slice(0, limit);

      const rows = await attachProfiles(combined);
      return rows.map((r) => ({
        id: r.id,
        displayName: r.profile?.display_name ?? null,
        kind: r.kind,
        subject: r.subject,
        cityId: r.city_id,
        score: r.score,
        comment: r.comment,
        createdAt: r.created_at,
      }));
    },
  });
}

// ============================================================
// Funil de abandono do planejador
// ============================================================

const STEP_LABELS: Record<PlannerStepName, string> = {
  budget: 'Orçamento',
  month: 'Mês',
  'transport-arrival': 'Transporte (ida)',
  city: 'Cidade',
  accommodation: 'Hospedagem',
  'local-transport': 'Transporte local',
  summary: 'Concluiu',
};

export interface PlannerFunnelStepDTO {
  step: PlannerStepName;
  label: string;
  count: number;
}

/** Quantos usuários distintos já alcançaram cada etapa alguma vez — nunca
 * diminui, mesmo depois que alguém termina ou reinicia o planejamento. */
export function useAdminPlannerFunnel() {
  return useQuery({
    queryKey: queryKeys.adminPlannerFunnel,
    queryFn: async (): Promise<PlannerFunnelStepDTO[]> => {
      const { data, error } = await supabase.rpc('admin_planner_funnel');
      if (error) throw error;
      return (data ?? []).map((r) => ({
        step: r.step as PlannerStepName,
        label: STEP_LABELS[r.step as PlannerStepName] ?? r.step,
        count: Number(r.users_reached),
      }));
    },
  });
}

export interface AdminStuckUserDTO {
  userId: string;
  step: PlannerStepName;
  stepLabel: string;
  displayName: string | null;
  updatedAt: string;
}

/** Quem está com um planejamento em andamento agora — nunca inclui
 * 'summary' (o Planner apaga a linha ao concluir). Base tanto da contagem
 * por etapa quanto do "ver quem" de cada uma. */
export function useAdminStuckUsers(options?: { enabled?: boolean }) {
  return useQuery({
    enabled: options?.enabled ?? true,
    queryKey: queryKeys.adminPlannerStuckUsers,
    queryFn: async (): Promise<AdminStuckUserDTO[]> => {
      const { data, error } = await supabase.rpc('admin_planner_progress_detail');
      if (error) throw error;

      const rows = await attachProfiles((data ?? []) as unknown as {
        user_id: string; step: string; updated_at: string;
      }[]);
      return rows.map((r) => ({
        userId: r.user_id,
        step: r.step as PlannerStepName,
        stepLabel: STEP_LABELS[r.step as PlannerStepName] ?? r.step,
        displayName: r.profile?.display_name ?? null,
        updatedAt: r.updated_at,
      }));
    },
  });
}
