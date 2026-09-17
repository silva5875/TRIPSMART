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
    // PKCE em vez do fluxo implícito (padrão do supabase-js): o código volta
    // como `?code=...` na query string, em vez de `#access_token=...` no
    // hash — mais simples de lidar com um BrowserRouter na mesma URL.
    // `detectSessionInUrl` faz a troca do code sozinho.
    flowType: 'pkce',
    detectSessionInUrl: true,
  },
});
