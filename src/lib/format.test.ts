import { describe, expect, it } from 'vitest';
import {
  budgetLabel, budgetRangeFor, costLabel, formatBirthDate, formatExactAge, formatProtocol,
  groupTypeLabel, localTransportLabel, monthName, transportLabel,
} from './format';

describe('monthName', () => {
  it('converte 1-12 em nome', () => {
    expect(monthName(1)).toBe('Janeiro');
    expect(monthName(12)).toBe('Dezembro');
  });

  it('trata null e fora de faixa', () => {
    expect(monthName(null)).toBe('Não definido');
    expect(monthName(0)).toBe('Não definido');
    expect(monthName(13)).toBe('Não definido');
  });
});

describe('transportLabel', () => {
  it('traduz o id conhecido', () => {
    expect(transportLabel('onibus')).toContain('Ônibus');
  });

  it("trata 'undecided' e null como não definido", () => {
    expect(transportLabel('undecided')).toBe('Não definido');
    expect(transportLabel(null)).toBe('Não definido');
  });

  it('devolve o próprio id quando desconhecido', () => {
    expect(transportLabel('foguete')).toBe('foguete');
  });
});

describe('localTransportLabel', () => {
  it("trata 'undecided' como não definido", () => {
    expect(localTransportLabel('undecided')).toBe('Não definido');
  });
});

describe('budgetRangeFor', () => {
  // RouteGenerator antes derivava o orçamento de "R$ 500–1.500" com
  // replace(/[^\d]/g,"").slice(0,5), o que produzia 50015.
  it('encontra a faixa pelo valor', () => {
    expect(budgetRangeFor(1000)?.id).toBe('economico');
    expect(budgetRangeFor(2000)?.id).toBe('moderado');
  });

  it('a faixa econômica tem max 1500, não 50015', () => {
    expect(budgetRangeFor(1000)?.max).toBe(1500);
  });
});

describe('budgetLabel', () => {
  it('cai para o valor formatado quando fora de todas as faixas', () => {
    expect(budgetLabel(999999)).toContain('999.999');
  });
});

describe('groupTypeLabel', () => {
  it('mapeia os tipos', () => {
    expect(groupTypeLabel('couple')).toBe('Casal');
    expect(groupTypeLabel('friends')).toBe('Amigos');
    expect(groupTypeLabel('solo')).toBe('Solo');
    expect(groupTypeLabel(null)).toBe('Solo');
  });
});

describe('formatBirthDate', () => {
  it('formata a data ISO em pt-BR', () => {
    expect(formatBirthDate('1998-06-20')).toBe('20/06/1998');
  });

  it('não desliza um dia por causa de fuso — meia-noite local, não UTC', () => {
    // Sem o T00:00:00 explícito, "1998-06-20" seria interpretado como UTC e
    // podia exibir 19/06 em fusos negativos (o caso do Brasil).
    expect(formatBirthDate('2000-01-01')).toBe('01/01/2000');
  });

  it('trata nulo como não definido', () => {
    expect(formatBirthDate(null)).toBe('Não definido');
  });
});

describe('formatExactAge', () => {
  it('formata os três números concordando plural/singular', () => {
    expect(formatExactAge(27, 3, 12)).toBe('27 anos, 3 meses e 12 dias');
    expect(formatExactAge(1, 1, 1)).toBe('1 ano, 1 mês e 1 dia');
    expect(formatExactAge(0, 0, 0)).toBe('0 anos, 0 meses e 0 dias');
  });

  it('trata qualquer componente nulo como não definido, não como zero', () => {
    expect(formatExactAge(null, null, null)).toBe('Não definido');
    expect(formatExactAge(27, null, 12)).toBe('Não definido');
  });
});

describe('formatProtocol', () => {
  it('preenche com zeros até 6 dígitos', () => {
    expect(formatProtocol(1, '2026-09-17T12:00:00Z')).toBe('TS-2026-000001');
    expect(formatProtocol(123456, '2026-09-17T12:00:00Z')).toBe('TS-2026-123456');
  });

  it('não trunca acima de 6 dígitos', () => {
    expect(formatProtocol(1234567, '2026-09-17T12:00:00Z')).toBe('TS-2026-1234567');
  });

  it('usa o ano de created_at, não o ano atual — o protocolo não pode mudar de aparência com o tempo', () => {
    expect(formatProtocol(42, '2025-01-05T00:00:00Z')).toBe('TS-2025-000042');
  });
});

describe('costLabel', () => {
  it('mostra Gratuito para zero e nulo', () => {
    expect(costLabel(0)).toBe('Gratuito');
    expect(costLabel(null)).toBe('Gratuito');
  });

  it('formata por pessoa', () => {
    expect(costLabel(50)).toBe('R$ 50/pessoa');
  });
});
