import { useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, Sparkles, X } from 'lucide-react';
import AppHeader from '@/components/AppHeader';
import Seo from '@/components/Seo';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { usePlans, useMyQuota, useStartCheckout, useManageSubscription, type PlanDTO } from '@/data/plans';
import { formatPriceCents } from '@/lib/format';
import { getErrorMessage } from '@/lib/errors';

const PlanCard = ({
  plan, isCurrent, isPaidHighlight, alreadyOnPaidPlan,
}: {
  plan: PlanDTO; isCurrent: boolean; isPaidHighlight: boolean; alreadyOnPaidPlan: boolean;
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const startCheckout = useStartCheckout();
  const manageSubscription = useManageSubscription();

  const isFree = plan.priceCents === 0;
  // Já tem outro plano pago ativo: trocar é o Customer Portal (proração
  // correta), não um Checkout novo — dois Checkouts em sequência criariam
  // duas assinaturas cobrando ao mesmo tempo.
  const isSwitch = alreadyOnPaidPlan && !isFree && !isCurrent;
  const pending = startCheckout.isPending || manageSubscription.isPending;

  const handleCta = () => {
    if (!user) {
      navigate('/auth');
      return;
    }
    if (isFree) {
      navigate('/planejar');
      return;
    }
    if (isSwitch) {
      manageSubscription.mutate(undefined, {
        onSuccess: (url) => { window.location.href = url; },
        onError: (error) =>
          toast({ title: 'Erro', description: getErrorMessage(error, 'Não foi possível abrir o gerenciamento da assinatura. Tente novamente.'), variant: 'destructive' }),
      });
      return;
    }
    startCheckout.mutate(plan.id as 'mochileiro' | 'explorador', {
      onSuccess: (url) => {
        window.location.href = url;
      },
      onError: (error) =>
        toast({ title: 'Erro', description: getErrorMessage(error, 'Não foi possível iniciar a assinatura. Tente novamente.'), variant: 'destructive' }),
    });
  };

  const ctaLabel = !user
    ? isFree ? 'Criar conta grátis' : 'Entrar para assinar'
    : isCurrent
      ? 'Seu plano atual'
      : isFree
        ? 'Começar grátis'
        : pending
          ? 'Redirecionando...'
          : isSwitch
            ? 'Trocar de plano'
            : 'Assinar agora';

  return (
    <div
      className={`flex flex-col p-6 rounded-2xl border bg-card space-y-5 ${
        isPaidHighlight ? 'border-pe-gold border-2' : 'border-border'
      }`}
      style={{ boxShadow: 'var(--card-shadow)' }}
    >
      {isPaidHighlight && (
        <div className="inline-flex items-center gap-1.5 self-start px-3 py-1 rounded-full bg-pe-gold text-pe-navy text-xs font-bold">
          <Sparkles size={12} /> Para quem planeja mais
        </div>
      )}
      <div>
        <h3 className="text-xl font-black text-foreground">{plan.name}</h3>
        <p className="text-sm text-muted-foreground mt-1">{plan.tagline}</p>
      </div>
      <div>
        <span className="text-3xl font-black text-foreground">{formatPriceCents(plan.priceCents)}</span>
        {!isFree && <span className="text-sm text-muted-foreground">/mês</span>}
      </div>
      <ul className="space-y-2 flex-1">
        <li className="flex items-start gap-2 text-sm text-foreground">
          <Check size={16} className="text-primary shrink-0 mt-0.5" />
          <span>
            <strong>
              {plan.itineraryLimitPerMonth} roteiro{plan.itineraryLimitPerMonth > 1 ? 's' : ''} personalizado
              {plan.itineraryLimitPerMonth > 1 ? 's' : ''}
            </strong>{' '}
            por mês
          </span>
        </li>
      </ul>
      <Button
        onClick={handleCta}
        disabled={isCurrent || pending}
        className={
          isCurrent
            ? 'rounded-full font-bold'
            : isPaidHighlight
              ? 'bg-pe-gold hover:bg-pe-gold/90 text-pe-navy border-0 rounded-full font-bold'
              : 'bg-pe-blue hover:bg-pe-blue/90 text-white border-0 rounded-full font-bold'
        }
        variant={isCurrent ? 'outline' : 'default'}
      >
        {ctaLabel}
      </Button>
    </div>
  );
};

type ComparisonCell = boolean | string;

type ComparisonRow = {
  label: string;
  tripsmart: ComparisonCell;
  agency: ComparisonCell;
  solo: ComparisonCell;
};

/**
 * Comparação com categorias genéricas (agência tradicional, planejar por
 * conta própria) — não com marcas concorrentes reais, já que não temos dado
 * confiável sobre o preço ou o processo delas pra comparar com precisão.
 */
const comparisonRows: ComparisonRow[] = [
  {
    label: 'Roteiro sob medida com IA',
    tripsmart: true,
    agency: false,
    solo: false,
  },
  {
    label: 'Pronto em minutos',
    tripsmart: true,
    agency: 'Dias de ida e volta por e-mail',
    solo: 'Horas pesquisando em vários sites',
  },
  {
    label: 'Focado em Pernambuco',
    tripsmart: true,
    agency: 'Depende da agência',
    solo: 'Depende de você garimpar tudo',
  },
  {
    label: 'Ajusta quantas vezes quiser',
    tripsmart: true,
    agency: false,
    solo: true,
  },
  {
    label: 'Sem comissão de agência',
    tripsmart: true,
    agency: false,
    solo: true,
  },
];

const ComparisonCellView = ({ value }: { value: ComparisonCell }) => {
  if (value === true) return <Check size={18} className="text-primary mx-auto" />;
  if (value === false) return <X size={18} className="text-muted-foreground/40 mx-auto" />;
  return <span className="text-xs text-muted-foreground block text-center">{value}</span>;
};

const Plans = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: plans = [], isLoading } = usePlans();
  const { data: quota } = useMyQuota();

  const cheapestPaidPriceLabel = useMemo(() => {
    const paid = plans.filter((p) => p.priceCents > 0).map((p) => p.priceCents);
    return paid.length ? formatPriceCents(Math.min(...paid)) : null;
  }, [plans]);

  // Volta do Checkout do Stripe com ?checkout=success|cancelled na URL — o
  // plano em si só muda quando o webhook processar o evento (pode levar
  // alguns segundos), por isso a mensagem não promete "já está ativo".
  useEffect(() => {
    const checkout = searchParams.get('checkout');
    if (!checkout) return;
    if (checkout === 'success') {
      toast({ title: 'Pagamento confirmado!', description: 'Seu plano é atualizado em instantes.' });
    } else if (checkout === 'cancelled') {
      toast({ title: 'Assinatura não concluída', description: 'Nenhuma cobrança foi feita.' });
    }
    searchParams.delete('checkout');
    setSearchParams(searchParams, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Seo
        title="Planos — TRIPSMART"
        description="Escolha o plano TripSmart ideal para planejar sua viagem por Pernambuco: Free, Mochileiro ou Explorador."
        path="/planos"
      />
      <AppHeader />

      <div className="max-w-5xl mx-auto px-4 md:px-6 py-10 md:py-16 space-y-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-3">
          <h1 className="text-3xl md:text-4xl font-black tracking-display text-foreground">Planos TripSmart</h1>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Quanto mais roteiros personalizados por mês, mais viagens você consegue planejar com a gente.
          </p>
          {user && quota && (
            <p className="text-sm font-semibold text-primary">
              Você está no plano {quota.planName} — {quota.usedThisMonth} de {quota.limitPerMonth} roteiros usados este mês
            </p>
          )}
        </motion.div>

        {isLoading ? (
          <p className="text-center text-muted-foreground py-12">Carregando planos...</p>
        ) : (
          <div className="grid gap-6 md:grid-cols-3">
            {plans.map((plan, i) => (
              <motion.div key={plan.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                <PlanCard
                  plan={plan}
                  isCurrent={quota?.planId === plan.id}
                  isPaidHighlight={plan.id === 'explorador'}
                  alreadyOnPaidPlan={!!quota && quota.planId !== 'free'}
                />
              </motion.div>
            ))}
          </div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-5"
        >
          <div className="text-center space-y-2">
            <h2 className="text-2xl md:text-3xl font-black tracking-display text-foreground">
              Por que TripSmart em vez de outro jeito de planejar?
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              {cheapestPaidPriceLabel
                ? `A partir de ${cheapestPaidPriceLabel}/mês, sem letra miúda — compare com o que você já conhece.`
                : 'Compare com o que você já conhece.'}
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card overflow-x-auto" style={{ boxShadow: 'var(--card-shadow)' }}>
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left font-semibold text-muted-foreground py-4 px-4 md:px-6 w-2/5">&nbsp;</th>
                  <th className="py-4 px-4 bg-pe-gold/10">
                    <span className="font-black text-foreground">TRIP<span className="text-pe-gold">SMART</span></span>
                  </th>
                  <th className="py-4 px-4 font-semibold text-muted-foreground">Agência de viagem</th>
                  <th className="py-4 px-4 font-semibold text-muted-foreground">Planejar sozinho</th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row) => (
                  <tr key={row.label} className="border-b border-border last:border-0">
                    <td className="py-4 px-4 md:px-6 text-foreground font-medium">{row.label}</td>
                    <td className="py-4 px-4 text-center bg-pe-gold/10">
                      <ComparisonCellView value={row.tripsmart} />
                    </td>
                    <td className="py-4 px-4 text-center">
                      <ComparisonCellView value={row.agency} />
                    </td>
                    <td className="py-4 px-4 text-center">
                      <ComparisonCellView value={row.solo} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground text-center max-w-lg mx-auto">
            Comparação com categorias gerais de agências e planejamento por conta própria — não com uma marca específica.
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Plans;
