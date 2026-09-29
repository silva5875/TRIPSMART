import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePlans } from '@/data/plans';
import { formatPriceCents } from '@/lib/format';

const DISMISSED_KEY = 'tripsmart:plan-banner-dismissed';

/** Rotas onde o banner atrapalharia um fluxo em andamento, ou seria
 * redundante (a própria página de planos). */
const HIDDEN_ON = ['/auth', '/redefinir-senha', '/admin', '/planejar', '/planos'];

const ROTATE_MS = 3000;

/**
 * Banner promocional no rodapé — não fixo (não cobre conteúdo, diferente do
 * aviso de cookies, que precisa de visibilidade garantida). Alterna sozinho
 * entre os planos pagos; dispensável pela sessão do navegador
 * (sessionStorage, não localStorage — volta a aparecer na próxima visita).
 */
const PlanBanner = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { data: plans = [] } = usePlans();
  const paidPlans = plans.filter((p) => p.priceCents > 0);

  const [dismissed, setDismissed] = useState(
    () => typeof window !== 'undefined' && sessionStorage.getItem(DISMISSED_KEY) === 'true'
  );
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (paidPlans.length < 2) return;
    const id = setInterval(() => {
      setActiveIndex((i) => (i + 1) % paidPlans.length);
    }, ROTATE_MS);
    return () => clearInterval(id);
  }, [paidPlans.length]);

  if (dismissed || paidPlans.length === 0 || HIDDEN_ON.includes(location.pathname)) return null;

  const active = paidPlans[activeIndex % paidPlans.length];

  const dismiss = () => {
    sessionStorage.setItem(DISMISSED_KEY, 'true');
    setDismissed(true);
  };

  return (
    <footer role="region" aria-label="Planos TripSmart" className="bg-pe-navy text-white border-t border-white/10">
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
        <div className="w-9 h-9 rounded-full bg-pe-gold/20 flex items-center justify-center shrink-0">
          <Sparkles size={16} className="text-pe-gold" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm text-white/90">
            <strong className="text-pe-gold">{active.name}</strong> — {formatPriceCents(active.priceCents)}/mês ·{' '}
            {active.itineraryLimitPerMonth} roteiros personalizados por mês
          </p>
          {paidPlans.length > 1 && (
            <div className="flex gap-1.5 mt-2" role="tablist" aria-label="Planos em destaque">
              {paidPlans.map((p, i) => (
                <button
                  key={p.id}
                  role="tab"
                  aria-selected={i === activeIndex}
                  aria-label={`Destacar plano ${p.name}`}
                  onClick={() => setActiveIndex(i)}
                  className={`h-1.5 rounded-full transition-all ${
                    i === activeIndex ? 'w-6 bg-pe-gold' : 'w-2 bg-white/25 hover:bg-white/40'
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
          <Button
            size="sm"
            onClick={() => navigate('/planos')}
            className="flex-1 sm:flex-none bg-pe-gold hover:bg-pe-gold/90 text-pe-navy border-0 font-bold rounded-full"
          >
            Ver planos
          </Button>
          <button
            onClick={dismiss}
            aria-label="Fechar aviso de planos"
            className="p-1.5 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </footer>
  );
};

export default PlanBanner;
