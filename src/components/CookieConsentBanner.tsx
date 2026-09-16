import { Cookie } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCookieConsent } from '@/contexts/CookieConsentContext';

/**
 * Aviso de consentimento para o rastreamento de páginas (ver src/data/analytics.ts).
 * Enquanto a decisão está pendente, nada é enviado: PageViewTracker só chama
 * trackPageView depois que `consent === 'accepted'`.
 */
const CookieConsentBanner = () => {
  const { consent, accept, decline } = useCookieConsent();

  if (consent !== 'pending') return null;

  return (
    <div
      role="region"
      aria-label="Aviso de cookies e analytics"
      className="fixed bottom-0 inset-x-0 z-50 bg-pe-navy text-white border-t border-white/10"
      style={{ boxShadow: '0 -8px 24px -8px rgba(0,0,0,0.25)' }}
    >
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
        <Cookie size={22} className="text-pe-gold shrink-0 mt-0.5 sm:mt-0" />

        <p className="text-sm text-white/85 flex-1">
          Usamos um identificador anônimo no seu navegador para entender como o site é usado —
          nenhum nome, email ou IP é guardado. Você pode recusar sem perder acesso a nenhuma
          função do TripSmart.
        </p>

        <div className="flex gap-2 w-full sm:w-auto shrink-0">
          <Button
            size="sm"
            variant="ghost"
            onClick={decline}
            className="flex-1 sm:flex-none text-white/80 hover:text-white hover:bg-white/10"
          >
            Recusar
          </Button>
          <Button
            size="sm"
            onClick={accept}
            className="flex-1 sm:flex-none bg-pe-gold hover:bg-pe-gold/90 text-pe-navy border-0 font-bold"
          >
            Aceitar
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CookieConsentBanner;
