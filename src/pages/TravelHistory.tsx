import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  Plane, Calendar, Users, MapPin, Trash2, DollarSign, Bus, Hotel,
  Utensils, Star, ChevronRight, MessageSquare, FileDown,
} from 'lucide-react';
import AppHeader from '@/components/AppHeader';
import Seo from '@/components/Seo';
import StarRating from '@/components/StarRating';
import { useToast } from '@/hooks/use-toast';
import {
  cityIdOf, useDeleteTravelRecord, useTravelHistory, type TravelRecord,
} from '@/data/travelHistory';
import {
  useMyAccommodationReviews, useMyActivityReviews,
  useUpsertAccommodationReview, useUpsertActivityReview,
} from '@/data/reviews';
import {
  budgetLabel, formatCurrency, formatProtocol, groupTypeLabel, localTransportLabel, monthName, transportLabel,
} from '@/lib/format';
import { exportElementToPdf, slugifyForFileName } from '@/lib/pdf';
import { getErrorMessage } from '@/lib/errors';
import type { TouristSpot } from '@/types/travel';

const TravelHistory = () => {
  const { loading: authLoading } = useRequireAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: records = [], isLoading } = useTravelHistory();
  const deleteRecord = useDeleteTravelRecord();

  const [selected, setSelected] = useState<TravelRecord | null>(null);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [accommodationDraft, setAccommodationDraft] = useState(0);
  const detailRef = useRef<HTMLDivElement>(null);

  const selectedCityId = selected ? cityIdOf(selected) : null;
  const { data: activityRatings = {} } = useMyActivityReviews(selectedCityId);
  const { data: accommodationRatings = {} } = useMyAccommodationReviews(selectedCityId);
  const upsertActivityReview = useUpsertActivityReview();
  const upsertAccommodationReview = useUpsertAccommodationReview();

  const spots = (selected?.tourist_spots ?? []) as TouristSpot[];
  const restaurants = (selected?.restaurants ?? []) as { name: string; cuisine?: string; address?: string; rating?: number }[];
  const savedAccommodationScore = selected?.accommodation
    ? accommodationRatings[selected.accommodation] ?? 0
    : 0;

  const openRecord = (record: TravelRecord) => {
    setSelected(record);
    setAccommodationDraft(0);
  };

  const handleDelete = (id: string, event: React.MouseEvent) => {
    event.stopPropagation();
    deleteRecord.mutate(id, {
      onError: (error: Error) =>
        toast({ title: 'Erro ao excluir', description: getErrorMessage(error, 'Não foi possível excluir a viagem. Tente novamente.'), variant: 'destructive' }),
    });
    if (selected?.id === id) setSelected(null);
  };

  const rateActivity = (spot: TouristSpot, score: number) => {
    if (!selectedCityId) {
      toast({
        title: 'Cidade não identificada',
        description: 'Não foi possível vincular a avaliação a uma cidade.',
        variant: 'destructive',
      });
      return;
    }
    upsertActivityReview.mutate(
      { activityName: spot.name, cityId: selectedCityId, score, category: spot.category ?? null },
      {
        onError: (error: Error) =>
          toast({ title: 'Erro ao avaliar', description: getErrorMessage(error, 'Não foi possível salvar sua avaliação. Tente novamente.'), variant: 'destructive' }),
      }
    );
  };

  const rateAccommodation = () => {
    if (!selected?.accommodation || !selectedCityId || !accommodationDraft) return;
    upsertAccommodationReview.mutate(
      {
        accommodationName: selected.accommodation,
        cityId: selectedCityId,
        score: accommodationDraft,
      },
      {
        onSuccess: () => toast({ title: 'Avaliação salva!' }),
        onError: (error: Error) =>
          toast({ title: 'Erro ao avaliar', description: getErrorMessage(error, 'Não foi possível salvar sua avaliação. Tente novamente.'), variant: 'destructive' }),
      }
    );
  };

  const exportToPdf = async () => {
    if (!detailRef.current || !selected) return;
    setExportingPdf(true);
    try {
      await exportElementToPdf(detailRef.current, `historico-${slugifyForFileName(selected.state)}`);
    } catch (error) {
      toast({
        title: 'Erro ao exportar PDF',
        description: getErrorMessage(error, 'Não foi possível exportar o PDF. Tente novamente.'),
        variant: 'destructive',
      });
    }
    setExportingPdf(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Seo title="Histórico de viagens — TRIPSMART" description="Acesse seus roteiros salvos e baixe em PDF." path="/#/historico" />
      <AppHeader />

      <div className="bg-pe-blue px-4 md:px-6 py-8 md:py-10">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-2xl md:text-3xl font-black tracking-display text-white">Histórico de viagens</h1>
          <p className="text-white/70 mt-2 text-sm md:text-base">Todas as suas viagens planejadas</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 md:py-10">
        {isLoading || authLoading ? (
          <p className="text-muted-foreground text-center py-12">Carregando...</p>
        ) : records.length === 0 ? (
          <div className="text-center py-20">
            <Plane size={48} className="mx-auto text-muted-foreground mb-4" />
            <p className="text-lg text-muted-foreground">Nenhuma viagem planejada ainda.</p>
            <Button onClick={() => navigate('/planejar')} className="mt-6 bg-pe-gold hover:bg-pe-gold/90 text-pe-navy border-0 rounded-full px-6 font-bold">
              Planejar primeira viagem
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
            {records.map((r, i) => (
              <motion.button
                key={r.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => openRecord(r)}
                className="rounded-2xl border border-border bg-card text-left hover:border-pe-blue/40 transition-all group overflow-hidden"
                style={{ boxShadow: 'var(--card-shadow)' }}
              >
                <div className="h-1.5 bg-pe-gold" />
                <div className="p-4 md:p-5">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="flex items-center gap-1 text-sm font-semibold px-2 py-1 rounded-full bg-pe-blue/10 text-primary"><MapPin size={14} /> {r.state}</span>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground"><Calendar size={12} /> {new Date(r.created_at).toLocaleDateString('pt-BR')}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="flex items-center gap-1 text-xs text-muted-foreground"><Users size={12} /> {r.people}p · {groupTypeLabel(r.group_type)}</span>
                        {r.month && <span className="text-xs px-2 py-0.5 rounded-full bg-pe-gold/10 text-pe-gold font-semibold">📅 {monthName(r.month)}</span>}
                      </div>
                      <p className="text-sm text-foreground font-bold tabular-nums">{budgetLabel(r.budget)}</p>
                      <p className="text-[10px] font-bold text-primary tracking-wider">
                        {formatProtocol(r.protocol_number, r.created_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      <button onClick={(e) => handleDelete(r.id, e)} className="text-muted-foreground hover:text-destructive transition-colors p-1" aria-label="Excluir viagem">
                        <Trash2 size={16} />
                      </button>
                      <ChevronRight size={18} className="text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </div>

      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto bg-background border-l border-border">
          <SheetHeader>
            <SheetTitle className="text-xl font-black text-foreground flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-pe-blue flex items-center justify-center"><MapPin size={16} className="text-white" /></div>
              {selected?.state}
            </SheetTitle>
            {selected && (
              <p className="text-xs font-bold text-primary tracking-wider">
                Protocolo {formatProtocol(selected.protocol_number, selected.created_at)}
              </p>
            )}
          </SheetHeader>
          {selected && (
            <div ref={detailRef} className="mt-6 space-y-6">
              <div className="p-4 rounded-xl bg-section-blue border border-pe-blue/10 space-y-3">
                <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Opções selecionadas</h3>
                <div className="grid grid-cols-2 gap-3">
                  <InfoItem icon={<DollarSign size={14} />} label="Orçamento" value={formatCurrency(selected.budget)} sublabel={budgetLabel(selected.budget)} color="text-pe-gold" />
                  <InfoItem icon={<Users size={14} />} label="Pessoas" value={`${selected.people}`} sublabel={groupTypeLabel(selected.group_type)} color="text-primary" />
                  <InfoItem icon={<Calendar size={14} />} label="Mês" value={monthName(selected.month)} color="text-pe-red" />
                  <InfoItem icon={<Bus size={14} />} label="Transporte (ida)" value={transportLabel(selected.transport_to_destination)} color="text-primary" />
                  <InfoItem icon={<Bus size={14} />} label="Transporte local" value={localTransportLabel(selected.local_transport)} color="text-pe-gold" />
                  <InfoItem icon={<Hotel size={14} />} label="Hospedagem" value={selected.accommodation || 'Não definido'} color="text-pe-red" />
                </div>
              </div>

              {selected.accommodation && (
                <div className="p-4 rounded-xl border border-border bg-card space-y-2">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Hotel size={14} className="text-pe-red" /> Avaliar hospedagem
                  </h3>
                  <p className="text-xs text-muted-foreground">{selected.accommodation}</p>
                  <StarRating
                    value={accommodationDraft || savedAccommodationScore}
                    onChange={setAccommodationDraft}
                    size={18}
                  />
                  <Button
                    size="sm"
                    disabled={!accommodationDraft || upsertAccommodationReview.isPending}
                    onClick={rateAccommodation}
                    className="rounded-full text-xs gap-1"
                  >
                    <MessageSquare size={12} /> {upsertAccommodationReview.isPending ? 'Salvando...' : 'Salvar avaliação'}
                  </Button>
                </div>
              )}

              {spots.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                    <Star size={14} className="text-pe-gold" /> Pontos turísticos ({spots.length})
                  </h3>
                  <div className="space-y-2">
                    {spots.map((spot) => (
                      <div key={spot.id} className="p-3 rounded-xl border border-border bg-card space-y-2">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{spot.imageEmoji}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-card-foreground truncate">{spot.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{spot.description}</p>
                          </div>
                          <div className="text-right">
                            <span className="flex items-center gap-0.5 text-xs"><Star size={10} className="text-pe-gold fill-pe-gold" />{spot.rating}</span>
                            <p className="text-[10px] text-muted-foreground">{spot.avgCostPerPerson === 0 ? 'Grátis' : `R$${spot.avgCostPerPerson}`}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 pt-1 border-t border-border/50">
                          <StarRating
                            value={activityRatings[spot.name] || 0}
                            onChange={(score) => rateActivity(spot, score)}
                            size={14}
                            showValue={false}
                          />
                          <span className="text-[10px] text-muted-foreground">
                            {activityRatings[spot.name] ? 'Avaliado ✓' : 'Avaliar'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {restaurants.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                    <Utensils size={14} className="text-pe-red" /> Restaurantes ({restaurants.length})
                  </h3>
                  <div className="space-y-2">
                    {restaurants.map((r, idx) => (
                      <div key={idx} className="p-3 rounded-xl border border-border bg-card flex items-center gap-3">
                        <span className="text-2xl">🍽️</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-card-foreground truncate">{r.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{r.cuisine || r.address}</p>
                        </div>
                        {r.rating && <span className="flex items-center gap-0.5 text-xs"><Star size={10} className="text-pe-gold fill-pe-gold" />{r.rating}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(selected.entertainment.length > 0 || selected.food.length > 0) && (
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Tags</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {selected.entertainment.map((tag) => <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-pe-blue/10 text-primary font-semibold">🎯 {tag}</span>)}
                    {selected.food.map((tag) => <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-pe-red/10 text-pe-red font-semibold">🍴 {tag}</span>)}
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-3 pt-4 border-t border-border">
                <Button onClick={exportToPdf} disabled={exportingPdf} variant="outline" className="w-full rounded-full font-bold gap-2">
                  <FileDown size={16} /> {exportingPdf ? 'Exportando...' : 'Baixar PDF'}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Planejado em {new Date(selected.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                </p>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

const InfoItem = ({ icon, label, value, sublabel, color = 'text-primary' }: {
  icon: React.ReactNode; label: string; value: string; sublabel?: string; color?: string;
}) => (
  <div className="flex items-start gap-2">
    <span className={`${color} mt-0.5`}>{icon}</span>
    <div>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="text-sm font-bold text-foreground">{value}</p>
      {sublabel && <p className="text-[10px] text-muted-foreground">{sublabel}</p>}
    </div>
  </div>
);

export default TravelHistory;
