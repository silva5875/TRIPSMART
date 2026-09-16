import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, XAxis } from 'recharts';
import {
  ChevronRight, ExternalLink, Eye, FileText, Heart, MapPin, MessageSquare, MonitorSmartphone,
  Star, TrendingUp, Users,
} from 'lucide-react';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import {
  useAdminTopPages, useAdminTopReferrers, useAdminTrafficOverview, useAdminTrafficSeries,
} from '@/data/analytics';
import {
  useAdminActivitySeries, useAdminComments, useAdminLikes, useAdminOverview,
  useAdminReviews, useAdminSharedItineraries, useAdminTravelHistory, useAdminUsers,
} from '@/data/admin';
import { budgetLabel, formatProtocol } from '@/lib/format';
import AdminDrillDownSheet, { type DrillDownRow } from './AdminDrillDownSheet';

type DrillDown = 'users-new-7d' | 'users-new-30d' | 'trips' | 'shared' | 'comments' | 'likes' | 'reviews' | null;

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

const trafficChartConfig = {
  pageviews: { label: 'Visualizações', color: 'hsl(var(--chart-1))' },
  visitors: { label: 'Visitantes únicos', color: 'hsl(var(--chart-4))' },
} satisfies ChartConfig;

const activityChartConfig = {
  signups: { label: 'Cadastros', color: 'hsl(var(--chart-1))' },
  trips: { label: 'Viagens salvas', color: 'hsl(var(--chart-2))' },
  shared: { label: 'Roteiros compartilhados', color: 'hsl(var(--chart-3))' },
} satisfies ChartConfig;

const dayLabel = (day: string) =>
  new Date(`${day}T00:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

interface AdminOverviewTabProps {
  /** Cartão "Usuários" já tem uma aba própria, rica, com busca e ações — em
   * vez de duplicar essa lista num painel lateral, ele só troca de aba. */
  onGoToUsers: () => void;
}

const AdminOverviewTab = ({ onGoToUsers }: AdminOverviewTabProps) => {
  const { data: traffic, isLoading: loadingTraffic } = useAdminTrafficOverview(30);
  const { data: trafficSeries = [], isLoading: loadingTrafficSeries } = useAdminTrafficSeries(30);
  const { data: topPages = [], isLoading: loadingTopPages } = useAdminTopPages(30, 8);
  const { data: topReferrers = [], isLoading: loadingTopReferrers } = useAdminTopReferrers(30, 8);

  const { data: counts, isLoading: loadingCounts } = useAdminOverview();
  const { data: activitySeries = [], isLoading: loadingActivitySeries } = useAdminActivitySeries(30);

  const [drillDown, setDrillDown] = useState<DrillDown>(null);

  // Cada consulta só é habilitada quando o cartão correspondente é aberto —
  // sem isso, todo carregamento do painel dispararia 5 requisições extras
  // que a maioria das visitas nunca usa.
  const { data: usersForNew = [], isLoading: loadingUsersForNew } = useAdminUsers();
  const { data: trips = [], isLoading: loadingTrips } = useAdminTravelHistory({ enabled: drillDown === 'trips' });
  const { data: shared = [], isLoading: loadingShared } = useAdminSharedItineraries({ enabled: drillDown === 'shared' });
  const { data: comments = [], isLoading: loadingComments } = useAdminComments({ enabled: drillDown === 'comments' });
  const { data: likes = [], isLoading: loadingLikes } = useAdminLikes({ enabled: drillDown === 'likes' });
  const { data: reviews = [], isLoading: loadingReviews } = useAdminReviews({ enabled: drillDown === 'reviews' });

  const trafficChartData = trafficSeries.map((d) => ({ ...d, label: dayLabel(d.day) }));
  const activityChartData = activitySeries.map((d) => ({ ...d, label: dayLabel(d.day) }));

  const newUsersRows = (days: number): DrillDownRow[] => {
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    return usersForNew
      .filter((u) => new Date(u.created_at).getTime() >= cutoff)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map((u) => ({
        id: u.id,
        title: u.display_name || 'Sem nome',
        subtitle: u.email ?? undefined,
        meta: `Cadastrado em ${formatDate(u.created_at)}`,
      }));
  };

  const tripsRows: DrillDownRow[] = trips.map((t) => ({
    id: t.id,
    title: t.state,
    subtitle: t.displayName ?? 'Sem nome',
    meta: `${formatProtocol(t.protocolNumber, t.createdAt)} · ${budgetLabel(t.budget)} · ${t.people} pessoa${t.people > 1 ? 's' : ''} · ${formatDate(t.createdAt)}`,
  }));

  const sharedRows: DrillDownRow[] = shared.map((s) => ({
    id: s.id,
    title: s.title,
    subtitle: `${s.displayName ?? 'Sem nome'} · ${s.cityName}`,
    meta: `${s.days} dia${s.days > 1 ? 's' : ''} · ${s.likesCount} curtida${s.likesCount !== 1 ? 's' : ''} · ${formatDate(s.createdAt)}`,
  }));

  const commentsRows: DrillDownRow[] = comments.map((c) => ({
    id: c.id,
    title: c.content,
    subtitle: `${c.displayName ?? 'Sem nome'} · em "${c.itineraryTitle ?? 'roteiro removido'}"`,
    meta: formatDate(c.createdAt),
  }));

  const likesRows: DrillDownRow[] = likes.map((l) => ({
    id: l.id,
    title: l.itineraryTitle ?? 'Roteiro removido',
    subtitle: `Curtido por ${l.displayName ?? 'Sem nome'}`,
    meta: formatDate(l.createdAt),
  }));

  const reviewsRows: DrillDownRow[] = reviews.map((r) => ({
    id: r.id,
    title: `${'⭐'.repeat(r.score)} ${r.subject}`,
    subtitle: `${r.kind === 'activity' ? 'Atividade' : 'Hospedagem'} · avaliado por ${r.displayName ?? 'Sem nome'}${r.comment ? ` — "${r.comment}"` : ''}`,
    meta: formatDate(r.createdAt),
  }));

  return (
    <div className="space-y-8">
      {/* ===== Tráfego ===== */}
      <div>
        <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-1">
          Tráfego do site
        </h2>
        <p className="text-xs text-muted-foreground mb-3">
          Inclui visitantes não logados. Contagem por dispositivo, sem dado que identifique a pessoa.
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <StatCard icon={<Eye size={16} />} label="Visualizações (30 dias)" value={traffic?.pageviews} loading={loadingTraffic} color="bg-pe-blue" />
          <StatCard icon={<Users size={16} />} label="Visitantes únicos (30 dias)" value={traffic?.unique_visitors} loading={loadingTraffic} color="bg-pe-gold" />
          <StatCard icon={<MonitorSmartphone size={16} />} label="Sessões (30 dias)" value={traffic?.unique_sessions} loading={loadingTraffic} color="bg-pe-red" />
          <StatCard icon={<TrendingUp size={16} />} label="Visualizações hoje" value={traffic?.pageviews_today} loading={loadingTraffic} color="bg-pe-navy" />
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 md:p-6" style={{ boxShadow: 'var(--card-shadow)' }}>
        <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-1">
          Fluxo de pessoas nos últimos 30 dias
        </h2>
        <p className="text-xs text-muted-foreground mb-4">
          Visualizações de página e visitantes únicos por dia, logados ou não.
        </p>
        {loadingTrafficSeries ? (
          <p className="text-sm text-muted-foreground text-center py-12">Carregando...</p>
        ) : (
          <ChartContainer config={trafficChartConfig} className="h-[260px] w-full">
            <BarChart data={trafficChartData}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} fontSize={11} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="pageviews" fill="var(--color-pageviews)" radius={3} />
              <Bar dataKey="visitors" fill="var(--color-visitors)" radius={3} />
            </BarChart>
          </ChartContainer>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <RankingCard
          icon={<FileText size={16} />}
          title="Páginas mais visitadas"
          loading={loadingTopPages}
          empty="Sem visualizações registradas ainda."
          rows={topPages.map((p) => ({ key: p.path, label: p.path, value: p.views }))}
        />
        <RankingCard
          icon={<ExternalLink size={16} />}
          title="De onde vêm as pessoas"
          loading={loadingTopReferrers}
          empty="Sem acessos externos registrados ainda (só visitas diretas)."
          rows={topReferrers.map((r) => ({ key: r.referrer_host, label: r.referrer_host, value: r.views }))}
        />
      </div>

      {/* ===== Atividade ===== */}
      <div>
        <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3">
          Atividade gerada no site
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <StatCard icon={<Users size={16} />} label="Usuários" value={counts?.total_users} loading={loadingCounts} color="bg-pe-blue" onClick={onGoToUsers} />
          <StatCard icon={<MapPin size={16} />} label="Viagens salvas" value={counts?.total_trips} loading={loadingCounts} color="bg-pe-gold" onClick={() => setDrillDown('trips')} />
          <StatCard icon={<TrendingUp size={16} />} label="Roteiros compartilhados" value={counts?.total_shared_itineraries} loading={loadingCounts} color="bg-pe-red" onClick={() => setDrillDown('shared')} />
          <StatCard icon={<MessageSquare size={16} />} label="Comentários" value={counts?.total_comments} loading={loadingCounts} color="bg-pe-navy" onClick={() => setDrillDown('comments')} />
          <StatCard icon={<Heart size={16} />} label="Curtidas" value={counts?.total_likes} loading={loadingCounts} color="bg-pe-red" onClick={() => setDrillDown('likes')} />
          <StatCard icon={<Star size={16} />} label="Avaliações" value={counts?.total_reviews} loading={loadingCounts} color="bg-pe-gold" onClick={() => setDrillDown('reviews')} />
          <StatCard icon={<Users size={16} />} label="Novos usuários (7 dias)" value={counts?.new_users_7d} loading={loadingCounts} color="bg-pe-blue" onClick={() => setDrillDown('users-new-7d')} />
          <StatCard icon={<Users size={16} />} label="Novos usuários (30 dias)" value={counts?.new_users_30d} loading={loadingCounts} color="bg-pe-blue" onClick={() => setDrillDown('users-new-30d')} />
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 md:p-6" style={{ boxShadow: 'var(--card-shadow)' }}>
        <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-1">
          Cadastros e conteúdo gerado
        </h2>
        <p className="text-xs text-muted-foreground mb-4">
          Cadastros, viagens salvas e roteiros compartilhados por dia.
        </p>
        {loadingActivitySeries ? (
          <p className="text-sm text-muted-foreground text-center py-12">Carregando...</p>
        ) : (
          <ChartContainer config={activityChartConfig} className="h-[260px] w-full">
            <BarChart data={activityChartData}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} fontSize={11} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="signups" fill="var(--color-signups)" radius={3} />
              <Bar dataKey="trips" fill="var(--color-trips)" radius={3} />
              <Bar dataKey="shared" fill="var(--color-shared)" radius={3} />
            </BarChart>
          </ChartContainer>
        )}
      </div>

      <AdminDrillDownSheet
        open={drillDown === 'trips'}
        onOpenChange={(open) => !open && setDrillDown(null)}
        title="Viagens salvas"
        description="Roteiros salvos por qualquer usuário, mais recentes primeiro."
        loading={loadingTrips}
        empty="Nenhuma viagem salva ainda."
        rows={tripsRows}
      />
      <AdminDrillDownSheet
        open={drillDown === 'shared'}
        onOpenChange={(open) => !open && setDrillDown(null)}
        title="Roteiros compartilhados"
        description="Roteiros publicados na comunidade por qualquer usuário."
        loading={loadingShared}
        empty="Nenhum roteiro compartilhado ainda."
        rows={sharedRows}
      />
      <AdminDrillDownSheet
        open={drillDown === 'comments'}
        onOpenChange={(open) => !open && setDrillDown(null)}
        title="Comentários"
        description="Comentários deixados na comunidade."
        loading={loadingComments}
        empty="Nenhum comentário ainda."
        rows={commentsRows}
      />
      <AdminDrillDownSheet
        open={drillDown === 'likes'}
        onOpenChange={(open) => !open && setDrillDown(null)}
        title="Curtidas"
        description="Curtidas recebidas pelos roteiros da comunidade."
        loading={loadingLikes}
        empty="Nenhuma curtida ainda."
        rows={likesRows}
      />
      <AdminDrillDownSheet
        open={drillDown === 'reviews'}
        onOpenChange={(open) => !open && setDrillDown(null)}
        title="Avaliações"
        description="Notas de atividades e hospedagens dadas pelos usuários."
        loading={loadingReviews}
        empty="Nenhuma avaliação ainda."
        rows={reviewsRows}
      />
      <AdminDrillDownSheet
        open={drillDown === 'users-new-7d'}
        onOpenChange={(open) => !open && setDrillDown(null)}
        title="Novos usuários (7 dias)"
        loading={loadingUsersForNew}
        empty="Nenhum cadastro nos últimos 7 dias."
        rows={newUsersRows(7)}
      />
      <AdminDrillDownSheet
        open={drillDown === 'users-new-30d'}
        onOpenChange={(open) => !open && setDrillDown(null)}
        title="Novos usuários (30 dias)"
        loading={loadingUsersForNew}
        empty="Nenhum cadastro nos últimos 30 dias."
        rows={newUsersRows(30)}
      />
    </div>
  );
};

const StatCard = ({
  icon, label, value, loading, color, onClick,
}: {
  icon: React.ReactNode; label: string; value: number | undefined; loading: boolean; color: string;
  onClick?: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={!onClick}
    className="p-4 rounded-2xl border border-border bg-card text-left transition-colors enabled:hover:border-primary/40 enabled:cursor-pointer disabled:cursor-default group"
    style={{ boxShadow: 'var(--card-shadow)' }}
  >
    <div className="flex items-start justify-between">
      <div className={`w-9 h-9 rounded-xl ${color} flex items-center justify-center text-white mb-2`}>
        {icon}
      </div>
      {onClick && (
        <ChevronRight size={16} className="text-muted-foreground/50 group-hover:text-primary transition-colors" />
      )}
    </div>
    <p className="text-2xl font-black text-foreground tabular-nums">
      {loading ? '—' : (value ?? 0).toLocaleString('pt-BR')}
    </p>
    <p className="text-xs text-muted-foreground font-semibold">{label}</p>
  </button>
);

const RankingCard = ({
  icon, title, rows, loading, empty,
}: {
  icon: React.ReactNode;
  title: string;
  rows: { key: string; label: string; value: number }[];
  loading: boolean;
  empty: string;
}) => (
  <div className="rounded-2xl border border-border bg-card p-4 md:p-5" style={{ boxShadow: 'var(--card-shadow)' }}>
    <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-3">
      {icon} {title}
    </h3>
    {loading ? (
      <p className="text-sm text-muted-foreground text-center py-8">Carregando...</p>
    ) : rows.length === 0 ? (
      <p className="text-sm text-muted-foreground py-4">{empty}</p>
    ) : (
      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.key} className="flex items-center justify-between gap-3 text-sm">
            <span className="text-foreground truncate">{r.label}</span>
            <span className="font-bold text-muted-foreground tabular-nums shrink-0">
              {r.value.toLocaleString('pt-BR')}
            </span>
          </div>
        ))}
      </div>
    )}
  </div>
);

export default AdminOverviewTab;
