import { FunctionsHttpError } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import { throwFunctionError } from './functionsError';

const httpError = (body: unknown) =>
  new FunctionsHttpError({ json: async () => body } as Response);

describe('throwFunctionError', () => {
  it('usa a mensagem do corpo {success:false, error} da edge function, não o texto genérico do SDK', async () => {
    await expect(throwFunctionError(httpError({ success: false, error: 'senha fraca' })))
      .rejects.toThrow('senha fraca');
  });

  it('cai no erro genérico quando o corpo não tem campo error', async () => {
    await expect(throwFunctionError(httpError({ success: false })))
      .rejects.toThrow('Edge Function returned a non-2xx status code');
  });

  it('cai no erro genérico quando o corpo não é JSON válido', async () => {
    const brokenJsonError = new FunctionsHttpError({
      json: async () => {
        throw new SyntaxError('Unexpected token');
      },
    } as unknown as Response);

    await expect(throwFunctionError(brokenJsonError))
      .rejects.toThrow('Edge Function returned a non-2xx status code');
  });

  it('repassa um Error comum sem tentar interpretá-lo como FunctionsHttpError', async () => {
    await expect(throwFunctionError(new Error('falha de rede')))
      .rejects.toThrow('falha de rede');
  });

  it('embrulha um valor não-Error em um Error', async () => {
    await expect(throwFunctionError('algo deu errado')).rejects.toThrow('algo deu errado');
  });
});
