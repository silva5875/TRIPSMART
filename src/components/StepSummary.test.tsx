import { StrictMode } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { TravelState } from '@/types/travel';

const saveTravelRecord = vi.fn();
const generateItinerary = vi.fn();
const shareItinerary = vi.fn();

vi.mock('@/data/travelHistory', () => ({
  saveTravelRecord: (...args: unknown[]) => saveTravelRecord(...args),
}));
vi.mock('@/data/catalog', () => ({
  generateItinerary: (...args: unknown[]) => generateItinerary(...args),
}));
vi.mock('@/data/itineraries', () => ({
  shareItinerary: (...args: unknown[]) => shareItinerary(...args),
}));
vi.mock('@/data/preferences', () => ({
  usePreferences: () => ({ data: null }),
  useRefreshPreferences: () => ({ mutate: vi.fn() }),
  toItineraryPreferences: () => null,
}));
vi.mock('@/data/reviews', () => ({
  useUpsertActivityReview: () => ({ mutate: vi.fn(), isPending: false }),
  useUpsertAccommodationReview: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));
// Leaflet não roda em jsdom e não interessa para o fluxo de save.
vi.mock('@/components/TravelMap', () => ({ default: () => null }));

import StepSummary from './StepSummary';

const viagem: TravelState = {
  budget: 3000, budgetLabel: 'Moderado', people: 2, adults: 2, children: 0,
  isCouple: true, rooms: 1, days: 5, groupType: 'couple', month: 3,
  transportToDestination: 'carro', city: 'porto-galinhas', cityName: 'Porto de Galinhas',
  selectedSpots: [], accommodation: null, localTransport: 'publico',
};

const renderSummary = (opts?: { strict?: boolean }) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const tree = (
    <QueryClientProvider client={client}>
      <StepSummary data={viagem} onRestart={() => {}} />
    </QueryClientProvider>
  );
  return render(opts?.strict ? <StrictMode>{tree}</StrictMode> : tree);
};

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('StepSummary — salvar viagem', () => {
  it('salva mesmo quando a geração do roteiro falha', async () => {
    // A regressão original: o save só disparava depois que a IA respondia,
    // então uma falha do n8n fazia o usuário perder a viagem inteira.
    generateItinerary.mockRejectedValue(new Error('n8n fora do ar'));
    saveTravelRecord.mockResolvedValue(undefined);

    renderSummary();

    await waitFor(() => expect(saveTravelRecord).toHaveBeenCalledTimes(1));
    expect(saveTravelRecord).toHaveBeenCalledWith('user-1', viagem);
  });

  it('salva uma única vez, mesmo com o roteiro chegando depois', async () => {
    generateItinerary.mockResolvedValue({ city: 'Porto de Galinhas', days: [] });
    saveTravelRecord.mockResolvedValue(undefined);

    renderSummary();

    await screen.findByText(/Salvo automaticamente no histórico/i);
    expect(saveTravelRecord).toHaveBeenCalledTimes(1);
  });

  it('mantém o retry disponível quando o save falha, sem expor o erro técnico', async () => {
    generateItinerary.mockResolvedValue(null);
    saveTravelRecord.mockRejectedValue(new Error('coluna city_id não existe'));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    renderSummary();

    await screen.findByText(/Não foi possível salvar a viagem/i);
    // O erro técnico nunca deve chegar à tela — só uma mensagem genérica.
    expect(screen.queryByText(/coluna city_id não existe/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Não foi possível salvar sua viagem\. Tente novamente\./i)).toBeInTheDocument();

    consoleSpy.mockRestore();
  });

  it('o retry regrava e confirma o sucesso', async () => {
    generateItinerary.mockResolvedValue(null);
    saveTravelRecord
      .mockRejectedValueOnce(new Error('falha temporária'))
      .mockResolvedValueOnce(undefined);

    renderSummary();

    const retry = await screen.findByRole('button', { name: /Tentar salvar de novo/i });
    fireEvent.click(retry);

    await screen.findByText(/Salvo automaticamente no histórico/i);
    expect(saveTravelRecord).toHaveBeenCalledTimes(2);
  });

  it('compartilhar não grava a viagem uma segunda vez', async () => {
    generateItinerary.mockResolvedValue(null);
    saveTravelRecord.mockResolvedValue(undefined);
    shareItinerary.mockResolvedValue(undefined);

    renderSummary();
    await screen.findByText(/Salvo automaticamente no histórico/i);

    fireEvent.click(screen.getByRole('button', { name: /Compartilhar roteiro/i }));

    await waitFor(() => expect(shareItinerary).toHaveBeenCalledTimes(1));
    expect(saveTravelRecord).toHaveBeenCalledTimes(1);
  });

  it('gera o roteiro uma única vez mesmo com o double-invoke do StrictMode', async () => {
    // Bug real encontrado em revisão: handleGenerateItinerary não tinha
    // guarda de "já em voo" (diferente de saveToHistory) — o double-invoke de
    // efeitos do StrictMode disparava duas chamadas concorrentes à IA paga.
    generateItinerary.mockResolvedValue({ city: 'Porto de Galinhas', days: [] });
    saveTravelRecord.mockResolvedValue(undefined);

    renderSummary({ strict: true });

    await screen.findByText(/Salvo automaticamente no histórico/i);
    expect(generateItinerary).toHaveBeenCalledTimes(1);
    // A mesma guarda vale para o save, que já era testado sem StrictMode.
    expect(saveTravelRecord).toHaveBeenCalledTimes(1);
  });

  it('compartilhar funciona mesmo quando o save no histórico falhou', async () => {
    generateItinerary.mockResolvedValue(null);
    saveTravelRecord.mockRejectedValue(new Error('banco fora'));
    shareItinerary.mockResolvedValue(undefined);

    renderSummary();
    await screen.findByText(/Não foi possível salvar a viagem/i);

    fireEvent.click(screen.getByRole('button', { name: /Compartilhar roteiro/i }));

    await waitFor(() => expect(shareItinerary).toHaveBeenCalledTimes(1));
  });
});
