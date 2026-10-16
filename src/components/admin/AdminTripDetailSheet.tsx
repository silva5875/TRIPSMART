import { Bus, Calendar, DollarSign, Hotel, MapPin, Star, Target, Users, Utensils } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  budgetLabel, formatCurrency, formatProtocol, groupTypeLabel, localTransportLabel, monthName, transportLabel,
} from '@/lib/format';
import { resolveSpotIcon } from '@/lib/spotIcons';
import type { AdminTravelHistoryDTO } from '@/data/admin';

interface AdminTripDetailSheetProps {
  trip: AdminTravelHistoryDTO | null;
  onOpenChange: (open: boolean) => void;
}

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

/**
 * Detalhe completo do roteiro de qualquer usuário, aberto a partir do
 * drill-down "Viagens salvas" do painel admin — mesma informação que
 * TravelHistory.tsx mostra para o dono da viagem, mas só leitura: avaliar
 * atividade/hospedagem e exportar PDF são ações do próprio usuário, não do
 * admin olhando a viagem de outra pessoa.
 */
const AdminTripDetailSheet = ({ trip, onOpenChange }: AdminTripDetailSheetProps) => {
  const restaurants = (trip?.restaurants ?? []) as { name: string; cuisine?: string; address?: string; rating?: number }[];

  return (
    <Sheet open={!!trip} onOpenChange={(open) => !open && onOpenChange(open)}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto bg-background border-l border-border">
        <SheetHeader>
          <SheetTitle className="text-xl font-black text-foreground flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-pe-blue flex items-center justify-center"><MapPin size={16} className="text-white" /></div>
            {trip?.state}
          </SheetTitle>
          {trip && (
            <p className="text-xs font-bold text-primary tracking-wider">
              {trip.displayName ?? 'Sem nome'} · Protocolo {formatProtocol(trip.protocolNumber, trip.createdAt)}
            </p>
          )}
        </SheetHeader>
        {trip && (
          <div className="mt-6 space-y-6">
            <div className="p-4 rounded-xl bg-section-blue border border-pe-blue/10 space-y-3">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Opções selecionadas</h3>
              <div className="grid grid-cols-2 gap-3">
                <InfoItem icon={<DollarSign size={14} />} label="Orçamento" value={formatCurrency(trip.budget)} sublabel={budgetLabel(trip.budget)} color="text-pe-gold" />
                <InfoItem icon={<Users size={14} />} label="Pessoas" value={`${trip.people}`} sublabel={groupTypeLabel(trip.groupType)} color="text-primary" />
                <InfoItem icon={<Calendar size={14} />} label="Mês" value={monthName(trip.month)} color="text-pe-red" />
                <InfoItem icon={<Bus size={14} />} label="Transporte (ida)" value={transportLabel(trip.transportToDestination)} color="text-primary" />
                <InfoItem icon={<Bus size={14} />} label="Transporte local" value={localTransportLabel(trip.localTransport)} color="text-pe-gold" />
                <InfoItem icon={<Hotel size={14} />} label="Hospedagem" value={trip.accommodation || 'Não definido'} color="text-pe-red" />
              </div>
            </div>

            {trip.touristSpots.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                  <Star size={14} className="text-pe-gold" /> Pontos turísticos ({trip.touristSpots.length})
                </h3>
                <div className="space-y-2">
                  {trip.touristSpots.map((spot) => (
                    <div key={spot.id} className="p-3 rounded-xl border border-border bg-card flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        {(() => { const Icon = resolveSpotIcon(spot.iconKey); return <Icon size={18} className="text-primary" />; })()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-card-foreground truncate">{spot.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{spot.description}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="flex items-center gap-0.5 text-xs"><Star size={10} className="text-pe-gold fill-pe-gold" />{spot.rating}</span>
                        <p className="text-[10px] text-muted-foreground">{spot.avgCostPerPerson === 0 ? 'Grátis' : `R$${spot.avgCostPerPerson}`}</p>
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
                      <div className="w-8 h-8 rounded-full bg-pe-red/10 flex items-center justify-center shrink-0">
                        <Utensils size={14} className="text-pe-red" />
                      </div>
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

            {(trip.entertainment.length > 0 || trip.food.length > 0) && (
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Tags</h3>
                <div className="flex flex-wrap gap-1.5">
                  {trip.entertainment.map((tag) => (
                    <span key={tag} className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-pe-blue/10 text-primary font-semibold">
                      <Target size={11} /> {tag}
                    </span>
                  ))}
                  {trip.food.map((tag) => (
                    <span key={tag} className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-pe-red/10 text-pe-red font-semibold">
                      <Utensils size={11} /> {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <p className="text-xs text-muted-foreground text-center pt-4 border-t border-border">
              Planejado em {new Date(trip.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
            </p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default AdminTripDetailSheet;
