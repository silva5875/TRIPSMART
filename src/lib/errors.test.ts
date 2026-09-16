import { describe, expect, it, vi } from 'vitest';
import { getErrorMessage } from './errors';

describe('getErrorMessage', () => {
  it('nunca devolve o texto técnico cru quando não reconhece o erro', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(getErrorMessage(new Error('Unexpected end of JSON input'), 'Algo deu errado.')).toBe('Algo deu errado.');
    expect(getErrorMessage(new Error('PGRST204: coluna x não existe'), 'Algo deu errado.')).toBe('Algo deu errado.');
    expect(getErrorMessage('erro cru qualquer', 'Algo deu errado.')).toBe('Algo deu errado.');
    consoleSpy.mockRestore();
  });

  it('sempre loga o erro original, mesmo devolvendo o fallback', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const error = new Error('detalhe técnico');
    getErrorMessage(error, 'Algo deu errado.');
    expect(consoleSpy).toHaveBeenCalledWith(error);
    consoleSpy.mockRestore();
  });

  it('traduz mensagens conhecidas do Supabase Auth', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(getErrorMessage(new Error('Invalid login credentials'))).toBe('Email ou senha incorretos.');
    expect(getErrorMessage(new Error('User already registered'))).toBe('Este email já está cadastrado. Tente entrar.');
    expect(getErrorMessage(new Error('Failed to fetch'))).toBe('Sem conexão com a internet. Verifique sua rede e tente novamente.');
    consoleSpy.mockRestore();
  });

  it('usa o fallback padrão quando o chamador não informa um', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(getErrorMessage(new Error('algo obscuro'))).toBe('Algo deu errado. Tente novamente.');
    consoleSpy.mockRestore();
  });
});
