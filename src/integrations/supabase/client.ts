import { createClient } from '@supabase/supabase-js';
import type { Database } from './database';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  throw new Error(
    'Supabase não configurado: defina VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY. Use .env.example como modelo.'
  );
}

// Não importe este client fora de src/data/ — o eslint bloqueia.
// Consuma os hooks de src/data/* no lugar.
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
    // PKCE é obrigatório aqui, não preferência: o app usa HashRouter, e o fluxo
    // implícito (padrão do supabase-js) devolve `#access_token=...` no hash —
    // exatamente onde moram as rotas. PKCE volta como `?code=...` na query
    // string e não colide. `detectSessionInUrl` faz a troca do code sozinho.
    flowType: 'pkce',
    detectSessionInUrl: true,
  },
});
