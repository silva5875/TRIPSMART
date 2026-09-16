import { describe, expect, it } from 'vitest';
import { buildTravelHistoryInsert, cityIdOf } from './travelHistory';
import type { TravelState } from '@/types/travel';

const viagem: TravelState = {
  budget: 3000,
  budgetLabel: 'Moderado',
  people: 2,
  adults: 2,
  children: 0,
  isCouple: true,
  rooms: 1,
  days: 5,
  groupType: 'couple',
  month: 3,
  transportToDestination: 'carro',
  city: 'porto-galinhas',
  cityName: 'Porto de Galinhas',
  selectedSpots: [
    { id: 's1', name: 'Piscinas naturais', description: '', peakMonths: [1], rating: 4.8, lat: -8.5, lng: -35, imageEmoji: '🐠', category: 'praia' },
  ],
  accommodation: null,
  localTransport: 'publico',
};

describe('buildTravelHistoryInsert', () => {
  it('leva o slug da cidade e a duração, que alimentam as preferências', () => {
    const row = buildTravelHistoryInsert('user-1', viagem);
    expect(row.city_id).toBe('porto-galinhas');
    expect(row.days).toBe(5);
  });

  it('mantém o state legível junto do slug', () => {
    expect(buildTravelHistoryInsert('user-1', viagem).state).toBe('Porto de Galinhas, PE');
  });

  it('o slug gravado é o mesmo que cityIdOf lê de volta', () => {
    const row = buildTravelHistoryInsert('user-1', viagem);
    expect(cityIdOf({ city_id: row.city_id, state: row.state })).toBe('porto-galinhas');
  });

  it('deriva entertainment dos pontos escolhidos', () => {
    expect(buildTravelHistoryInsert('user-1', viagem).entertainment).toEqual(['Piscinas naturais']);
  });
});

describe('cityIdOf', () => {
  it('usa city_id quando o registro já tem o slug', () => {
    expect(cityIdOf({ city_id: 'porto-galinhas', state: 'Qualquer coisa' })).toBe('porto-galinhas');
  });

  // A regressão que motivou a migration: o Histórico gravava avaliações usando
  // "Porto de Galinhas, PE" como city_id, enquanto o Planner usava o slug.
  // As duas nunca casavam.
  it('deriva o slug do state em registros antigos sem city_id', () => {
    expect(cityIdOf({ city_id: null, state: 'Porto de Galinhas, PE' })).toBe('porto-galinhas');
    expect(cityIdOf({ city_id: null, state: 'Recife, PE' })).toBe('recife');
  });

  it('resolve nomes com acento', () => {
    expect(cityIdOf({ city_id: null, state: 'Gravatá, PE' })).toBe('gravata');
    expect(cityIdOf({ city_id: null, state: 'Tamandaré, PE' })).toBe('tamandare');
  });

  it('devolve null quando a cidade não é reconhecida', () => {
    expect(cityIdOf({ city_id: null, state: 'Fortaleza, CE' })).toBeNull();
  });
});
