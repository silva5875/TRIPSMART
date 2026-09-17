import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCookieConsent } from '@/contexts/CookieConsentContext';
import { trackPageView } from '@/data/analytics';

/**
 * Não renderiza nada — só observa a rota (via react-router) e registra uma
 * visualização a cada troca de página. Precisa ficar dentro do
 * <BrowserRouter>, mas fora de <Routes>, para ver toda navegação sem
 * precisar existir em cada página.
 *
 * Só rastreia com consentimento aceito (ver CookieConsentContext). Enquanto a
 * decisão está pendente ou foi recusada, nenhuma chamada é feita — não é um
 * filtro depois do fato, o insert nem acontece.
 */
const PageViewTracker = () => {
  const location = useLocation();
  const { user } = useAuth();
  const { consent } = useCookieConsent();
  const lastTracked = useRef<string | null>(null);

  useEffect(() => {
    if (consent !== 'accepted') return;

    // Evita duplicar o mesmo path em disparos muito próximos — cobre o
    // double-invoke de efeitos do StrictMode em desenvolvimento.
    if (lastTracked.current === location.pathname) return;
    lastTracked.current = location.pathname;

    trackPageView({ path: location.pathname, userId: user?.id ?? null });
  }, [location.pathname, user?.id, consent]);

  return null;
};

export default PageViewTracker;
