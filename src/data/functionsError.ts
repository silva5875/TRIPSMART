import { FunctionsHttpError } from '@supabase/supabase-js';

/**
 * O `error` que `supabase.functions.invoke()` devolve para uma resposta
 * não-2xx tem `.message` fixo em "Edge Function returned a non-2xx status
 * code" — nunca o texto real que a função respondeu. O corpo de verdade (o
 * envelope `{success:false, error}` que todas as edge functions deste app
 * devolvem) só existe em `error.context`, um Response cru que precisa ser
 * lido à parte.
 *
 * Sempre lance com isto em vez de `throw error` direto, ou toda mensagem de
 * erro de edge function vira esse texto genérico para o usuário.
 */
export async function throwFunctionError(error: unknown): Promise<never> {
  if (error instanceof FunctionsHttpError) {
    let message: string | undefined;
    try {
      const body = await error.context.json();
      message = typeof body?.error === 'string' ? body.error : undefined;
    } catch {
      // Corpo não é JSON, ou o stream já foi consumido — sem mensagem melhor
      // a extrair; cai no throw genérico abaixo.
    }
    if (message) throw new Error(message);
  }

  throw error instanceof Error ? error : new Error(String(error));
}
