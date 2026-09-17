import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import {
  ChevronRight, ExternalLink, Eye, FileText, Heart, MapPin, MessageSquare, MonitorSmartphone,
  Star, TrendingUp, Users,
} from 'lucide-react';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  useAdminDayTraffic, useAdminTopPages, useAdminTopReferrers, useAdminTrafficOverview, useAdminTrafficSeries,
} from '@/data/analytics';
import {
  useAdminActivitySeries, useAdminComments, useAdminLikes, useAdminOverview, useAdminPlannerFunnel,
  useAdminReviews, useAdminSharedItineraries, useAdminStuckUsers, useAdminTravelHistory, useAdminUsers,
} from '@/data/admin';
import type { PlannerStepName } from '@/data/plannerProgress';
import { budgetLabel, formatProtocol } from '@/lib/format';
import { getErrorMessage } from '@/lib/errors';
import AdminDrillDownSheet, { type DrillDownRow } from './AdminDrillDownSheet';

type DrillDown = 'users-new-7d' | 'users-new-30d' | 'trips' | 'shared' | 'comments' | 'likes' | 'reviews' | null;

/** Ordem fixa das etapas do assistente — a mesma de PlannerStepName em
 * src/data/plannerProgress/index.ts. Nunca inclui 'summary': o Planner apaga
 * a linha de planner_progress ao concluir, então quem está "travado agora"
 * nunca está nessa etapa. */
const STUCK_STEP_ORDER: PlannerStepName[] = [
  'budget', 'month', 'transport-arrival', 'city', 'accommodation', 'local-transport',
];

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

const funnelChartConfig = {
  count: { label: 'Usuários que chegaram', color: 'hsl(var(--chart-2))' },
} satisfies ChartConfig;

const dayLabel = (day: string) =>
  new Date(`${day}T00:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

/** `day` é uma data pura ('YYYY-MM-DD'), sem hora — `T00:00:00` explícito
 * evita que `new Date(day)` (interpretado como UTC) exiba o dia anterior em
 * fusos negativos, como o do Brasil. */
const dayLabelLong = (day: string) =>
  new Date(`${day}T00:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

/**
 * Extrai o dia clicado a partir do evento de clique do `<BarChart>` (não de
 * cada `<Bar>` individual). Com ~30 dias divididos em 2-3 barras por
 * categoria, cada barra renderiza com só 1-2px de largura — clicar nela com
 * precisão é praticamente impossível, mesmo de propósito. `activePayload`
 * usa a mesma área de detecção (a coluna inteira do dia) que já reage ao
 * hover do tooltip, bem mais larga e fácil de acertar.
 */
const dayFromChartClick = (state: { activePayload?: { payload: { day: string } }[] } | null): string | null =>
  state?.activePayload?.[0]?.payload?.day ?? null;

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
  // Dia clicado numa barra dos gráficos abaixo — 'YYYY-MM-DD' ou null.
  const [activityDay, setActivityDay] = useState<string | null>(null);
  const [trafficDay, setTrafficDay] = useState<string | null>(null);

  // Cada consulta só é habilitada quando o cartão (ou o dia de um gráfico)
  // correspondente é aberto — sem isso, todo carregamento do painel
  // dispararia várias requisições extras que a maioria das visitas nunca usa.
  const { data: usersForNew = [], isLoading: loadingUsersForNew } = useAdminUsers();
  const { data: trips = [], isLoading: loadingTrips } = useAdminTravelHistory({ enabled: drillDown === 'trips' || !!activityDay });
  const { data: shared = [], isLoading: loadingShared } = useAdminSharedItineraries({ enabled: drillDown === 'shared' || !!activityDay });
  const { data: comments = [], isLoading: loadingComments } = useAdminComments({ enabled: drillDown === 'comments' });
  const { data: likes = [], isLoading: loadingLikes } = useAdminLikes({ enabled: drillDown === 'likes' });
  const { data: reviews = [], isLoading: loadingReviews } = useAdminReviews({ enabled: drillDown === 'reviews' });
  const { data: dayTraffic, isLoading: loadingDayTraffic, error: dayTrafficError } = useAdminDayTraffic(trafficDay);

  // Funil do planejador: `funnel` nunca diminui (é histórico); `stuckUsers` é
  // o instantâneo de agora (planner_progress, nunca inclui 'summary').
  const { data: funnel = [], isLoading: loadingFunnel } = useAdminPlannerFunnel();
  const { data: stuckUsers = [], isLoading: loadingStuckUsers } = useAdminStuckUsers();
  const [stuckStepFilter, setStuckStepFilter] = useState<PlannerStepName | null>(null);

  const trafficChartData = trafficSeries.map((d) => ({ ...d, label: dayLabel(d.day) }));
  const activityChartData = activitySeries.map((d) => ({ ...d, label: dayLabel(d.day) }));

  const funnelChartData = funnel.map((f) => ({ label: f.label, count: f.count }));

  const stuckCounts = useMemo(() => {
    const byStep = new Map<PlannerStepName, { label: string; count: number }>();
    for (const u of stuckUsers) {
      const current = byStep.get(u.step);
      byStep.set(u.step, { label: u.stepLabel, count: (current?.count ?? 0) + 1 });
    }
    return STUCK_STEP_ORDER
      .filter((step) => byStep.has(step))
      .map((step) => ({ key: step, label: byStep.get(step)!.label, value: byStep.get(step)!.count }));
  }, [stuckUsers]);

  const stuckUsersRows: DrillDownRow[] = stuckStepFilter
    ? stuckUsers
        .filter((u) => u.step === stuckStepFilter)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .map((u) => ({
          id: u.userId,
          title: u.displayName || 'Sem nome',
          meta: `Parado desde ${formatDate(u.updatedAt)}`,
        }))
    : [];

  const newUsersRows = (days: number): DrillDownRow[] => {
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    return usersForNew
      .filter((u) => new Date(u.createdAt).getTime() >= cutoff)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((u) => ({
        id: u.id,
        title: u.displayName || 'Sem nome',
        subtitle: u.email ?? undefined,
        meta: `Cadastrado em ${formatDate(u.createdAt)}`,
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

  // Junta as três origens do gráfico de atividade (cadastro, viagem salva,
  // roteiro compartilhado) numa lista só, filtrada pelo dia clicado na barra.
  const activityDayRows: DrillDownRow[] = activityDay
    ? [
        ...usersForNew
          .filter((u) => u.createdAt.slice(0, 10) === activityDay)
          .map((u) => ({
            id: `user-${u.id}`,
            title: u.displayName || 'Sem nome',
            subtitle: `Novo cadastro · ${u.email ?? ''}`,
          })),
        ...trips
          .filter((t) => t.createdAt.slice(0, 10) === activityDay)
          .map((t) => ({
            id: `trip-${t.id}`,
            title: t.state,
            subtitle: `Viagem salva · ${t.displayName ?? 'Sem nome'} · ${budgetLabel(t.budget)}`,
          })),
        ...shared
          .filter((s) => s.createdAt.slice(0, 10) === activityDay)
          .map((s) => ({
            id: `shared-${s.id}`,
            title: s.title,
            subtitle: `Roteiro compartilhado · ${s.displayName ?? 'Sem nome'}`,
          })),
      ]
    : [];

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
          Visualizações de página e visitantes únicos por dia, logados ou não. Clique numa barra para ver o detalhe do dia.
        </p>
        {loadingTrafficSeries ? (
          <p className="text-sm text-muted-foreground text-center py-12">Carregando...</p>
        ) : (
          <ChartContainer config={trafficChartConfig} className="h-[260px] w-full">
            <BarChart
              data={trafficChartData}
              className="cursor-pointer"
              onClick={(state) => { const day = dayFromChartClick(state); if (day) setTrafficDay(day); }}
            >
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
          Cadastros, viagens salvas e roteiros compartilhados por dia. Clique numa barra para ver o detalhe do dia.
        </p>
        {loadingActivitySeries ? (
          <p className="text-sm text-muted-foreground text-center py-12">Carregando...</p>
        ) : (
          <ChartContainer config={activityChartConfig} className="h-[260px] w-full">
            <BarChart
              data={activityChartData}
              className="cursor-pointer"
              onClick={(state) => { const day = dayFromChartClick(state); if (day) setActivityDay(day); }}
            >
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

      {/* ===== Funil do planejador ===== */}
      <div>
        <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-1">
          Funil do planejador
        </h2>
        <p className="text-xs text-muted-foreground mb-3">
          De todo mundo que já começou a planejar uma viagem, quantos chegaram em cada etapa — e quem está parado em qual etapa agora.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <div className="rounded-2xl border border-border bg-card p-4 md:p-6" style={{ boxShadow: 'var(--card-shadow)' }}>
          <h3 className="text-sm font-bold text-foreground mb-3">Quantos chegaram em cada etapa</h3>
          {loadingFunnel ? (
            <p className="text-sm text-muted-foreground text-center py-12">Carregando...</p>
          ) : funnel.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">Ainda sem dados de funil.</p>
          ) : (
            <ChartContainer config={funnelChartConfig} className="h-[280px] w-full">
              <BarChart data={funnelChartData} layout="vertical" margin={{ left: 8 }}>
                <CartesianGrid horizontal={false} />
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="label" width={110} tickLine={false} axisLine={false} fontSize={12} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="var(--color-count)" radius={3} />
              </BarChart>
            </ChartContainer>
          )}
        </div>
        <RankingCard
          icon={<Users size={16} />}
          title="Travados agora, por etapa"
          loading={loadingStuckUsers}
          empty="Nenhum planejamento em andamento agora."
          rows={stuckCounts}
          onRowClick={(step) => setStuckStepFilter(step as PlannerStepName)}
        />
      </div>

      <AdminDrillDownSheet
        open={!!stuckStepFilter}
        onOpenChange={(open) => !open && setStuckStepFilter(null)}
        title={`Travados em "${stuckCounts.find((c) => c.key === stuckStepFilter)?.label ?? stuckStepFilter}"`}
        description="Quem tem um planejamento em andamento parado nesta etapa."
        loading={loadingStuckUsers}
        empty="Ninguém travado nesta etapa agora."
        rows={stuckUsersRows}
      />

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

      <AdminDrillDownSheet
        open={!!activityDay}
        onOpenChange={(open) => !open && setActivityDay(null)}
        title={activityDay ? `Atividade em ${dayLabelLong(activityDay)}` : 'Atividade do dia'}
        description="Cadastros, viagens salvas e roteiros compartilhados neste dia."
        loading={loadingUsersForNew || loadingTrips || loadingShared}
        empty="Nenhuma atividade registrada neste dia."
        rows={activityDayRows}
      />

      <Sheet open={!!trafficDay} onOpenChange={(open) => !open && setTrafficDay(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto bg-background border-l border-border">
          <SheetHeader>
            <SheetTitle className="text-xl font-black text-foreground">
              {trafficDay ? `Tráfego em ${dayLabelLong(trafficDay)}` : 'Tráfego do dia'}
            </SheetTitle>
          </SheetHeader>
          {loadingDayTraffic ? (
            <p className="text-sm text-muted-foreground text-center py-12">Carregando...</p>
          ) : dayTrafficError ? (
            <p className="text-sm text-destructive text-center py-12">
              {getErrorMessage(dayTrafficError, 'Não foi possível carregar o tráfego deste dia. Tente novamente.')}
            </p>
          ) : (
            <div className="mt-6 space-y-6">
              <div className="grid grid-cols-2 gap-3">
                <StatCard icon={<Eye size={16} />} label="Visualizações" value={dayTraffic?.pageviews} loading={false} color="bg-pe-blue" />
                <StatCard icon={<Users size={16} />} label="Visitantes únicos" value={dayTraffic?.unique_visitors} loading={false} color="bg-pe-gold" />
              </div>
              <RankingCard
                icon={<FileText size={16} />}
                title="Páginas mais visitadas"
                loading={false}
                empty="Sem visualizações neste dia."
                rows={(dayTraffic?.top_pages ?? []).map((p) => ({ key: p.path, label: p.path, value: p.views }))}
              />
              <RankingCard
                icon={<ExternalLink size={16} />}
                title="De onde vieram as pessoas"
                loading={false}
                empty="Sem acessos externos neste dia (só visitas diretas)."
                rows={(dayTraffic?.top_referrers ?? []).map((r) => ({ key: r.referrer_host, label: r.referrer_host, value: r.views }))}
              />
            </div>
          )}
        </SheetContent>
      </Sheet>
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
  icon, title, rows, loading, empty, onRowClick,
}: {
  icon: React.ReactNode;
  title: string;
  rows: { key: string; label: string; value: number }[];
  loading: boolean;
  empty: string;
  /** Quando informado, cada linha vira um botão — usado por "Travados agora"
   * pra abrir quem exatamente está parado naquela etapa. */
  onRowClick?: (key: string) => void;
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
        {rows.map((r) => {
          const content = (
            <>
              <span className="text-foreground truncate group-hover:text-primary">{r.label}</span>
              <span className="font-bold text-muted-foreground tabular-nums shrink-0">
                {r.value.toLocaleString('pt-BR')}
              </span>
            </>
          );
          return onRowClick ? (
            <button
              key={r.key}
              type="button"
              onClick={() => onRowClick(r.key)}
              className="flex items-center justify-between gap-3 text-sm w-full text-left group"
            >
              {content}
            </button>
          ) : (
            <div key={r.key} className="flex items-center justify-between gap-3 text-sm">
              {content}
            </div>
          );
        })}
      </div>
    )}
  </div>
);

export default AdminOverviewTab;
