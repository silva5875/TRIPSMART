/**
 * URL pública canônica do site, usada em `<link rel="canonical">`, Open Graph e
 * JSON-LD.
 *
 * Defina `VITE_SITE_URL` no ambiente de produção com o domínio real. Sem ela,
 * cai na origem atual — o que mantém localhost e previews coerentes consigo
 * mesmos em vez de apontarem para um domínio alheio.
 */
const configured = import.meta.env.VITE_SITE_URL?.trim().replace(/\/+$/, '');

export const SITE_URL =
  configured || (typeof window !== 'undefined' ? window.location.origin : '');

/** Monta uma URL absoluta a partir de um caminho (`/`, `/#/comunidade`, ...). */
export const siteUrl = (path = '/') => `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
