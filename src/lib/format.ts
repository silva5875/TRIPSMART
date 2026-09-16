import {
  budgetRanges,
  localTransportOptions,
  monthNames,
  transportOptions,
} from '@/data/mockData';

const NAO_DEFINIDO = 'Não definido';

/** `undecided` é o valor que os steps gravam quando o usuário pula a escolha. */
const isUndecided = (id: string | null | undefined) => !id || id === 'undecided';

export const formatCurrency = (value: number) => `R$ ${value.toLocaleString('pt-BR')}`;

export const monthName = (month: number | null | undefined) =>
  month && month >= 1 && month <= 12 ? monthNames[month - 1] : NAO_DEFINIDO;

export const groupTypeLabel = (groupType: string | null | undefined) => {
  if (groupType === 'couple') return 'Casal';
  if (groupType === 'friends') return 'Amigos';
  if (groupType === 'familia') return 'Família';
  return 'Solo';
};

export const budgetRangeFor = (budget: number) =>
  budgetRanges.find((r) => budget >= r.min && budget <= r.max);

export const budgetLabel = (budget: number) => {
  const range = budgetRangeFor(budget);
  return range ? `${range.emoji} ${range.label}` : formatCurrency(budget);
};

export const transportLabel = (id: string | null | undefined) => {
  if (isUndecided(id)) return NAO_DEFINIDO;
  const option = transportOptions.find((o) => o.id === id);
  return option ? `${option.emoji} ${option.label}` : id!;
};

export const localTransportLabel = (id: string | null | undefined) => {
  if (isUndecided(id)) return NAO_DEFINIDO;
  const option = localTransportOptions.find((o) => o.id === id);
  return option ? `${option.emoji} ${option.label}` : id!;
};

export const initials = (name: string | null | undefined) => (name || 'U')[0].toUpperCase();

export const costLabel = (cost: number | null | undefined) =>
  !cost ? 'Gratuito' : `${formatCurrency(cost)}/pessoa`;

export const formatBirthDate = (isoDate: string | null | undefined) =>
  isoDate ? new Date(`${isoDate}T00:00:00`).toLocaleDateString('pt-BR') : NAO_DEFINIDO;

/**
 * Número de protocolo de uma viagem salva. O ano vem de `createdAtIso` (a
 * data em que a viagem foi salva), não da data atual — senão o mesmo
 * protocolo mudaria de aparência conforme o calendário avança, o que não faz
 * sentido para um número que deve ser fixo para sempre.
 */
export const formatProtocol = (protocolNumber: number, createdAtIso: string) => {
  const year = new Date(createdAtIso).getFullYear();
  return `TS-${year}-${String(protocolNumber).padStart(6, '0')}`;
};

/**
 * Idade exata em anos, meses e dias — os três números vêm prontos do banco
 * (função `age()` do Postgres, que já resolve mês de tamanho diferente e ano
 * bissexto corretamente). Aqui é só formatação.
 */
export const formatExactAge = (
  years: number | null | undefined,
  months: number | null | undefined,
  days: number | null | undefined
) => {
  if (years == null || months == null || days == null) return NAO_DEFINIDO;
  const anos = `${years} ano${years !== 1 ? 's' : ''}`;
  const meses = `${months} ${months !== 1 ? 'meses' : 'mês'}`;
  const dias = `${days} dia${days !== 1 ? 's' : ''}`;
  return `${anos}, ${meses} e ${dias}`;
};
