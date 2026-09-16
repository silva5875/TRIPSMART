import type { Database as GeneratedDatabase, Json } from './types';

export type { Json };

/** Objetos que vão para colunas jsonb. O cast é inevitável: o tipo gerado é `Json`. */
export const toJson = (value: unknown) => value as Json;

/**
 * `types.ts` é gerado pelo Supabase e ainda não conhece as migrations de
 * 2026-09-15. Em vez de editá-lo (o gerador sobrescreve), estendemos aqui.
 *
 * As tabelas são listadas uma a uma, e não via `Omit<...> & {...}`: o
 * supabase-js precisa que o schema seja um objeto simples para resolver os
 * tipos de Insert/Update. Com interseção ele desiste e cai em `never[]`, o que
 * quebra todo `.insert()` e `.upsert()` do app.
 *
 * Quando regenerar os tipos, apague este arquivo e volte a importar `Database`
 * direto de `./types`.
 */

type GeneratedPublic = GeneratedDatabase['public'];
type GeneratedTables = GeneratedPublic['Tables'];

type ActivityReviews = GeneratedTables['activity_reviews'];
type TravelHistory = GeneratedTables['travel_history'];
type SharedItineraries = GeneratedTables['shared_itineraries'];
type ItineraryComments = GeneratedTables['itinerary_comments'];

/** Migration 20260916100000: colunas de soft delete. */
type SoftDeleteRow = { deleted_at: string | null; deleted_by: string | null };
type SoftDeleteWrite = { deleted_at?: string | null; deleted_by?: string | null };

/** Migration 20260915120100: categoria da atividade avaliada. */
type ActivityReviewsExtended = {
  Row: ActivityReviews['Row'] & { category: string | null };
  Insert: ActivityReviews['Insert'] & { category?: string | null };
  Update: ActivityReviews['Update'] & { category?: string | null };
  Relationships: ActivityReviews['Relationships'];
};

/**
 * Migration 20260915120100: slug canônico da cidade e duração da viagem.
 * Migration 20260917110000: número de protocolo. Sem propósito no Insert —
 * é gerado pelo DEFAULT da coluna (uma sequence), o cliente nunca o define.
 */
type TravelHistoryExtended = {
  Row: TravelHistory['Row'] & { city_id: string | null; days: number | null; protocol_number: number } & SoftDeleteRow;
  Insert: TravelHistory['Insert'] & { city_id?: string | null; days?: number | null } & SoftDeleteWrite;
  Update: TravelHistory['Update'] & { city_id?: string | null; days?: number | null; protocol_number?: number } & SoftDeleteWrite;
  Relationships: TravelHistory['Relationships'];
};

type SharedItinerariesExtended = {
  Row: SharedItineraries['Row'] & SoftDeleteRow;
  Insert: SharedItineraries['Insert'] & SoftDeleteWrite;
  Update: SharedItineraries['Update'] & SoftDeleteWrite;
  Relationships: SharedItineraries['Relationships'];
};

type ItineraryCommentsExtended = {
  Row: ItineraryComments['Row'] & SoftDeleteRow;
  Insert: ItineraryComments['Insert'] & SoftDeleteWrite;
  Update: ItineraryComments['Update'] & SoftDeleteWrite;
  Relationships: ItineraryComments['Relationships'];
};

/**
 * Migration 20260916100000, com 'dev' adicionado em 20260916140000.
 * 'dev' não concede permissão nenhuma — é só a etiqueta "Dev responsável" na
 * aba Usuários. Quem decide acesso ao painel é 'admin', via is_admin().
 */
export type AppRole = 'admin' | 'moderator' | 'user' | 'dev';

type UserRolesTable = {
  Row: { id: string; user_id: string; role: AppRole; created_at: string };
  Insert: { id?: string; user_id: string; role: AppRole; created_at?: string };
  Update: { id?: string; user_id?: string; role?: AppRole; created_at?: string };
  Relationships: [];
};

/** Migration 20260916110000, com nascimento/idade adicionados em 20260916150000. */
export interface AdminUserRow {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  banned_until: string | null;
  roles: AppRole[];
  trips_count: number;
  shared_count: number;
  birth_date: string | null;
  /** Nulos em conjunto quando o usuário não tem data de nascimento registrada. */
  age_years: number | null;
  age_months: number | null;
  age_days: number | null;
}

/** Migration 20260916150000. Tabela dedicada — ver comentário na migration
 * sobre por que birth_date saiu de `profiles`. */
type DtnascimentoTable = {
  Row: { user_id: string; birth_date: string; created_at: string; updated_at: string };
  Insert: { user_id: string; birth_date: string; created_at?: string; updated_at?: string };
  Update: { user_id?: string; birth_date?: string; created_at?: string; updated_at?: string };
  Relationships: [];
};

export interface AdminOverviewCounts {
  total_users: number;
  total_trips: number;
  total_shared_itineraries: number;
  total_comments: number;
  total_likes: number;
  total_reviews: number;
  new_users_7d: number;
  new_users_30d: number;
}

export interface AdminActivityDay {
  day: string;
  signups: number;
  trips: number;
  shared: number;
}

/** Migration 20260916120000. */
type PageViewsTable = {
  Row: {
    id: string;
    path: string;
    referrer_host: string | null;
    visitor_id: string;
    session_id: string;
    user_id: string | null;
    device_type: 'mobile' | 'desktop' | null;
    created_at: string;
  };
  Insert: {
    id?: string;
    path: string;
    referrer_host?: string | null;
    visitor_id: string;
    session_id: string;
    user_id?: string | null;
    device_type?: 'mobile' | 'desktop' | null;
    created_at?: string;
  };
  Update: never;
  Relationships: [];
};

export interface AdminTrafficOverview {
  pageviews: number;
  unique_visitors: number;
  unique_sessions: number;
  pageviews_today: number;
}

export interface AdminTrafficDay {
  day: string;
  pageviews: number;
  visitors: number;
}

export interface AdminTopPage {
  path: string;
  views: number;
}

export interface AdminTopReferrer {
  referrer_host: string;
  views: number;
}

/**
 * Migration 20260915120200.
 *
 * `type` e não `interface`: interfaces não ganham index signature implícita,
 * então não satisfazem o `Record<string, unknown>` que o postgrest-js exige em
 * `GenericTable`. Com uma interface aqui, o schema inteiro deixa de casar com
 * `GenericSchema` e TODO `.insert()`/`.upsert()` do app vira `never[]`.
 */
export type UserPreferencesRow = {
  user_id: string;
  favorite_categories: string[];
  typical_budget_min: number | null;
  typical_budget_max: number | null;
  default_group_type: string | null;
  preferred_transport: string | null;
  preferred_local_transport: string | null;
  typical_days: number | null;
  source: 'derived' | 'declared' | 'mixed';
  schema_version: number;
  created_at: string;
  updated_at: string;
};

type UserPreferencesTable = {
  Row: UserPreferencesRow;
  Insert: Partial<Omit<UserPreferencesRow, 'user_id'>> & { user_id: string };
  Update: Partial<UserPreferencesRow>;
  Relationships: [];
};

/** Migration 20260915120000. */
type CityAliasesTable = {
  Row: { alias: string; city_id: string };
  Insert: { alias: string; city_id: string };
  Update: { alias?: string; city_id?: string };
  Relationships: [];
};

/**
 * Migration 20260917120000. Uma linha por usuário — cada etapa respondida no
 * Planner substitui a anterior via upsert.
 */
type PlannerProgressTable = {
  Row: { user_id: string; step: string; data: Json; updated_at: string };
  Insert: { user_id: string; step: string; data: Json; updated_at?: string };
  Update: { user_id?: string; step?: string; data?: Json; updated_at?: string };
  Relationships: [];
};

export type Database = {
  __InternalSupabase: GeneratedDatabase['__InternalSupabase'];
  public: {
    Tables: {
      accommodation_reviews: GeneratedTables['accommodation_reviews'];
      activity_reviews: ActivityReviewsExtended;
      itinerary_comments: ItineraryCommentsExtended;
      itinerary_likes: GeneratedTables['itinerary_likes'];
      itinerary_ratings: GeneratedTables['itinerary_ratings'];
      profiles: GeneratedTables['profiles'];
      saved_itineraries: GeneratedTables['saved_itineraries'];
      shared_itineraries: SharedItinerariesExtended;
      travel_history: TravelHistoryExtended;
      user_preferences: UserPreferencesTable;
      city_aliases: CityAliasesTable;
      user_roles: UserRolesTable;
      page_views: PageViewsTable;
      dtnascimento: DtnascimentoTable;
      planner_progress: PlannerProgressTable;
    };
    Views: GeneratedPublic['Views'];
    Functions: {
      refresh_my_preferences: {
        Args: Record<string, never>;
        Returns: UserPreferencesRow;
      };
      has_role: {
        Args: { _user_id: string; _role: AppRole };
        Returns: boolean;
      };
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      admin_list_users: {
        Args: Record<string, never>;
        Returns: AdminUserRow[];
      };
      admin_set_role: {
        Args: { target_user_id: string; role_to_set: AppRole; should_grant: boolean };
        Returns: void;
      };
      admin_set_user_banned: {
        Args: { target_user_id: string; banned: boolean };
        Returns: void;
      };
      admin_overview_counts: {
        Args: Record<string, never>;
        Returns: AdminOverviewCounts[];
      };
      admin_activity_series: {
        Args: { days_back?: number };
        Returns: AdminActivityDay[];
      };
      admin_traffic_overview: {
        Args: { days_back?: number };
        Returns: AdminTrafficOverview[];
      };
      admin_traffic_series: {
        Args: { days_back?: number };
        Returns: AdminTrafficDay[];
      };
      admin_top_pages: {
        Args: { days_back?: number; limit_count?: number };
        Returns: AdminTopPage[];
      };
      admin_top_referrers: {
        Args: { days_back?: number; limit_count?: number };
        Returns: AdminTopReferrer[];
      };
    };
    Enums: GeneratedPublic['Enums'];
    CompositeTypes: GeneratedPublic['CompositeTypes'];
  };
};
