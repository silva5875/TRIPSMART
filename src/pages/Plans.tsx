import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, Sparkles } from 'lucide-react';
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

const Plans = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: plans = [], isLoading } = usePlans();
  const { data: quota } = useMyQuota();

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
      </div>
    </div>
  );
};

export default Plans;
