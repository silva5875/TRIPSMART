import { createContext, useContext, useState, type ReactNode } from 'react';

export type ConsentStatus = 'pending' | 'accepted' | 'declined';

const STORAGE_KEY = 'tripsmart_cookie_consent';

function readStoredConsent(): ConsentStatus {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === 'accepted' || value === 'declined' ? value : 'pending';
  } catch {
    // Storage bloqueado (modo privado, cookies desativados): trata como
    // pendente. O aviso reaparece a cada visita, mas nada trava por causa
    // disso — só o rastreamento fica sempre desligado nesse caso.
    return 'pending';
  }
}

interface CookieConsentContextValue {
  consent: ConsentStatus;
  accept: () => void;
  decline: () => void;
}

const CookieConsentContext = createContext<CookieConsentContextValue | null>(null);

/**
 * Guarda a decisão de consentimento de analytics em um único lugar, para que
 * o aviso na tela e o rastreador de páginas (PageViewTracker) nunca discordem
 * sobre se a pessoa aceitou ou não.
 */
export const CookieConsentProvider = ({ children }: { children: ReactNode }) => {
  const [consent, setConsent] = useState<ConsentStatus>(readStoredConsent);

  const persist = (value: ConsentStatus) => {
    setConsent(value);
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // Sem storage, a escolha só vale para esta aba/sessão.
    }
  };

  return (
    <CookieConsentContext.Provider
      value={{ consent, accept: () => persist('accepted'), decline: () => persist('declined') }}
    >
      {children}
    </CookieConsentContext.Provider>
  );
};

export const useCookieConsent = () => {
  const ctx = useContext(CookieConsentContext);
  if (!ctx) throw new Error('useCookieConsent must be used within CookieConsentProvider');
  return ctx;
};
