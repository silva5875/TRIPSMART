import { describe, expect, it, vi } from 'vitest';
import { isAtLeast18, isSafeExternalUrl } from './validation';

describe('isAtLeast18', () => {
  it('aceita quem fez 18 anos exatamente hoje', () => {
    vi.setSystemTime(new Date('2026-09-16T12:00:00'));
    expect(isAtLeast18('2008-09-16')).toBe(true);
    vi.useRealTimers();
  });

  it('rejeita quem faz 18 anos só amanhã', () => {
    vi.setSystemTime(new Date('2026-09-16T12:00:00'));
    expect(isAtLeast18('2008-09-17')).toBe(false);
    vi.useRealTimers();
  });

  it('aceita quem fez 18 anos ontem', () => {
    vi.setSystemTime(new Date('2026-09-16T12:00:00'));
    expect(isAtLeast18('2008-09-15')).toBe(true);
    vi.useRealTimers();
  });

  it('resolve aniversário em 29 de fevereiro corretamente em ano não bissexto', () => {
    // 2004 é bissexto; 2026 não é. Quem nasceu em 2004-02-29 já fez 18 antes
    // de 2026-09-16 de qualquer forma, então isto cobre o parsing, não o
    // "quando exatamente" — o caso interessante de bissexto vale mais perto
    // do próprio aniversário.
    vi.setSystemTime(new Date('2022-03-01T12:00:00'));
    expect(isAtLeast18('2004-02-29')).toBe(true);
    vi.useRealTimers();
  });

  it('rejeita data inválida', () => {
    expect(isAtLeast18('não é uma data')).toBe(false);
  });

  it('rejeita string vazia', () => {
    expect(isAtLeast18('')).toBe(false);
  });

  it('rejeita data que não existe no calendário', () => {
    expect(isAtLeast18('2024-02-30')).toBe(false);
    expect(isAtLeast18('2023-02-29')).toBe(false); // 2023 não é bissexto
  });

  it('lê a data como local, não UTC — a fronteira dos 18 anos não desliza com o fuso', () => {
    // new Date("YYYY-MM-DD") (sem o parsing manual) leria isto como UTC
    // meia-noite; em fusos a oeste de UTC isso "puxa" a data para o dia
    // anterior e derrubaria este teste antes da correção.
    vi.setSystemTime(new Date('2026-09-16T12:00:00'));
    expect(isAtLeast18('2008-09-17')).toBe(false);
    vi.useRealTimers();
  });
});

describe('isSafeExternalUrl', () => {
  // Achado de revisão: bookingUrl vem do n8n (fonte externa) e ia direto para
  // <a href> sem checar o protocolo — se a fonte de dados do n8n fosse
  // comprometida, um href "javascript:" executaria no contexto da sessão logada.
  it('aceita http e https', () => {
    expect(isSafeExternalUrl('https://booking.com/hotel/123')).toBe(true);
    expect(isSafeExternalUrl('http://exemplo.com')).toBe(true);
  });

  it('rejeita javascript: e outros esquemas executáveis', () => {
    expect(isSafeExternalUrl('javascript:alert(document.cookie)')).toBe(false);
    expect(isSafeExternalUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
    expect(isSafeExternalUrl('vbscript:msgbox(1)')).toBe(false);
  });

  it('rejeita valores nulos, vazios e não-URL', () => {
    expect(isSafeExternalUrl(null)).toBe(false);
    expect(isSafeExternalUrl(undefined)).toBe(false);
    expect(isSafeExternalUrl('')).toBe(false);
    expect(isSafeExternalUrl('não é uma url')).toBe(false);
  });
});
