import { Bar, BarChart, CartesianGrid, XAxis } from 'recharts';
import {
  ExternalLink, Eye, FileText, Heart, MapPin, MessageSquare, MonitorSmartphone,
  Star, TrendingUp, Users,
} from 'lucide-react';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import {
  useAdminTopPages, useAdminTopReferrers, useAdminTrafficOverview, useAdminTrafficSeries,
} from '@/data/analytics';
import { useAdminActivitySeries, useAdminOverview } from '@/data/admin';

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

const AdminOverviewTab = () => {
  const { data: traffic, isLoading: loadingTraffic } = useAdminTrafficOverview(30);
  const { data: trafficSeries = [], isLoading: loadingTrafficSeries } = useAdminTrafficSeries(30);
  const { data: topPages = [], isLoading: loadingTopPages } = useAdminTopPages(30, 8);
  const { data: topReferrers = [], isLoading: loadingTopReferrers } = useAdminTopReferrers(30, 8);

  const { data: counts, isLoading: loadingCounts } = useAdminOverview();
  const { data: activitySeries = [], isLoading: loadingActivitySeries } = useAdminActivitySeries(30);

  const trafficChartData = trafficSeries.map((d) => ({ ...d, label: dayLabel(d.day) }));
  const activityChartData = activitySeries.map((d) => ({ ...d, label: dayLabel(d.day) }));

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
          <StatCard icon={<Users size={16} />} label="Usuários" value={counts?.total_users} loading={loadingCounts} color="bg-pe-blue" />
          <StatCard icon={<MapPin size={16} />} label="Viagens salvas" value={counts?.total_trips} loading={loadingCounts} color="bg-pe-gold" />
          <StatCard icon={<TrendingUp size={16} />} label="Roteiros compartilhados" value={counts?.total_shared_itineraries} loading={loadingCounts} color="bg-pe-red" />
          <StatCard icon={<MessageSquare size={16} />} label="Comentários" value={counts?.total_comments} loading={loadingCounts} color="bg-pe-navy" />
          <StatCard icon={<Heart size={16} />} label="Curtidas" value={counts?.total_likes} loading={loadingCounts} color="bg-pe-red" />
          <StatCard icon={<Star size={16} />} label="Avaliações" value={counts?.total_reviews} loading={loadingCounts} color="bg-pe-gold" />
          <StatCard icon={<Users size={16} />} label="Novos usuários (7 dias)" value={counts?.new_users_7d} loading={loadingCounts} color="bg-pe-blue" />
          <StatCard icon={<Users size={16} />} label="Novos usuários (30 dias)" value={counts?.new_users_30d} loading={loadingCounts} color="bg-pe-blue" />
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
    </div>
  );
};

const StatCard = ({
  icon, label, value, loading, color,
}: {
  icon: React.ReactNode; label: string; value: number | undefined; loading: boolean; color: string;
}) => (
  <div className="p-4 rounded-2xl border border-border bg-card" style={{ boxShadow: 'var(--card-shadow)' }}>
    <div className={`w-9 h-9 rounded-xl ${color} flex items-center justify-center text-white mb-2`}>
      {icon}
    </div>
    <p className="text-2xl font-black text-foreground tabular-nums">
      {loading ? '—' : (value ?? 0).toLocaleString('pt-BR')}
    </p>
    <p className="text-xs text-muted-foreground font-semibold">{label}</p>
  </div>
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
