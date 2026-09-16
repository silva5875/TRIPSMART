import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, RotateCcw, Map, ExternalLink, CalendarDays, Share2, MapPin, Clock, DollarSign, Lightbulb, AlertTriangle, ChevronDown, ChevronUp, Navigation, Info, Instagram, Phone, MessageSquare, FileDown } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import TravelMap from "@/components/TravelMap";
import StarRating from "@/components/StarRating";
import { generateItinerary } from "@/data/catalog";
import { shareItinerary } from "@/data/itineraries";
import { saveTravelRecord, type SavedTravelRecord } from "@/data/travelHistory";
import { useUpsertAccommodationReview, useUpsertActivityReview } from "@/data/reviews";
import { toItineraryPreferences, usePreferences, useRefreshPreferences } from "@/data/preferences";
import { formatProtocol, localTransportLabel, monthName, transportLabel } from "@/lib/format";
import { exportElementToPdf, slugifyForFileName } from "@/lib/pdf";
import { isSafeExternalUrl } from "@/lib/validation";
import { getErrorMessage } from "@/lib/errors";
import type { TravelState } from "@/types/travel";
import type { RichItinerary, RichDay, RichActivity, AttractionZone, AttractionHighlight } from "@/types/richItinerary";

interface StepSummaryProps {
  data: TravelState;
  onRestart: () => void;
}

const StepSummary = ({ data, onRestart }: StepSummaryProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [saveState, setSaveState] = useState<'saving' | 'saved' | 'error'>('saving');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [protocol, setProtocol] = useState<SavedTravelRecord | null>(null);
  const [shared, setShared] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [loadingItinerary, setLoadingItinerary] = useState(false);
  const [richItinerary, setRichItinerary] = useState<RichItinerary | null>(null);
  const [expandedZones, setExpandedZones] = useState<Record<number, boolean>>({});
  const [expandedHighlights, setExpandedHighlights] = useState<Record<string, boolean>>({});
  const [exportingPdf, setExportingPdf] = useState(false);
  const itineraryRef = useRef<HTMLDivElement>(null);
  const [activityRatings, setActivityRatings] = useState<Record<string, number>>({});
  const [activityComments, setActivityComments] = useState<Record<string, string>>({});
  const [accommodationRating, setAccommodationRating] = useState(0);
  const [accommodationComment, setAccommodationComment] = useState("");

  // Guardas síncronas contra gravação dupla. O state só atualiza no próximo
  // render, então clicar em "Compartilhar" enquanto o auto-save estava em voo
  // inseria a viagem duas vezes. `inFlightRef` guarda a promessa em curso para
  // que quem chegar depois espere o mesmo save em vez de disparar outro.
  const savedRef = useRef(false);
  const inFlightRef = useRef<Promise<void> | null>(null);
  // Mesma ideia para a geração do roteiro por IA, mas sem trava permanente:
  // diferente do save (que só deve acontecer uma vez), gerar de novo depois
  // de um erro é o comportamento esperado do botão "Tentar novamente".
  const generatingRef = useRef(false);

  const { data: preferences } = usePreferences();
  const refreshPreferences = useRefreshPreferences();
  const upsertActivityReview = useUpsertActivityReview();
  const upsertAccommodationReview = useUpsertAccommodationReview();

  const toggleZone = (i: number) => setExpandedZones((p) => ({ ...p, [i]: !p[i] }));
  const toggleHighlight = (key: string) => setExpandedHighlights((p) => ({ ...p, [key]: !p[key] }));

  const realAccommodationCost = data.accommodation ? data.accommodation.pricePerNight * data.days : 0;
  const realActivitiesCost = data.selectedSpots.reduce((sum, s) => sum + (s.avgCostPerPerson || 0), 0) * data.people;

  const computedCostBreakdown = richItinerary?.costBreakdown
    ? {
        accommodation: realAccommodationCost || richItinerary.costBreakdown.accommodation,
        food: richItinerary.costBreakdown.food,
        transport: richItinerary.costBreakdown.transport,
        activities: realActivitiesCost || richItinerary.costBreakdown.activities,
        extras: richItinerary.costBreakdown.extras,
      }
    : null;

  const computedTotal = computedCostBreakdown
    ? Object.values(computedCostBreakdown).reduce((a, b) => a + b, 0)
    : richItinerary?.estimatedTotalCost || 0;

  /**
   * Grava a viagem no histórico exatamente uma vez. Chamadas concorrentes
   * esperam o mesmo save em vez de abrir outro.
   */
  const saveToHistory = async (): Promise<void> => {
    if (!user || savedRef.current) return;
    if (inFlightRef.current) return inFlightRef.current;

    setSaveState('saving');
    setSaveError(null);

    const attempt = (async () => {
      let saved: SavedTravelRecord;
      try {
        saved = await saveTravelRecord(user.id, data);
      } catch (error) {
        setSaveError(getErrorMessage(error, 'Não foi possível salvar sua viagem. Tente novamente.'));
        setSaveState('error');
        throw error;
      }

      // A partir daqui a viagem já está garantida no banco — nenhuma falha
      // abaixo pode fazer a tela reportar "erro" (e travar o retry: ele só
      // reexecuta quando savedRef.current ainda é false) para um save que já
      // aconteceu de verdade.
      savedRef.current = true;
      setSaveState('saved');
      setProtocol(saved);
      // Recalcula o perfil de gosto com a viagem recém-salva. Falha aqui não
      // invalida o save: a viagem já está no histórico.
      refreshPreferences.mutate();
    })();

    inFlightRef.current = attempt;
    try {
      await attempt;
    } catch {
      // Já refletido em saveState; o botão "Tentar salvar de novo" reexecuta.
    } finally {
      inFlightRef.current = null;
    }
  };

  const handleGenerateItinerary = async () => {
    // Sem esta guarda, o double-invoke de efeitos do StrictMode (dev) disparava
    // duas chamadas concorrentes a uma IA paga; a resposta que resolvesse por
    // último sobrescrevia a outra silenciosamente. `finally` libera a guarda
    // ao final, então o botão "Tentar novamente" continua funcionando depois
    // de um erro.
    if (!user || generatingRef.current) return;
    generatingRef.current = true;
    setLoadingItinerary(true);
    try {
      const result = await generateItinerary(data, toItineraryPreferences(preferences));
      if (result) {
        setRichItinerary(result);
      } else {
        toast({ title: "Não foi possível gerar o roteiro", description: "Tente novamente mais tarde.", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Erro ao gerar roteiro", description: getErrorMessage(error, 'Não foi possível gerar o roteiro. Tente novamente mais tarde.'), variant: "destructive" });
    } finally {
      setLoadingItinerary(false);
      generatingRef.current = false;
    }
  };

  // Salva e gera o roteiro em paralelo, de propósito.
  //
  // Antes o save só disparava depois que a IA devolvia o roteiro, então uma
  // falha do n8n fazia o usuário perder a viagem inteira. A viagem já está
  // completa quando o resumo abre; o roteiro rico é enriquecimento.
  useEffect(() => {
    saveToHistory();
    handleGenerateItinerary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveActivityReview = (activityName: string) => {
    const score = activityRatings[activityName];
    if (!score) return;
    const spot = data.selectedSpots.find((s) => s.name === activityName);
    upsertActivityReview.mutate(
      {
        activityName,
        cityId: data.city,
        score,
        comment: activityComments[activityName] || null,
        category: spot?.category ?? null,
      },
      {
        onSuccess: () => toast({ title: "Avaliação salva!" }),
        onError: (error: Error) =>
          toast({ title: "Erro ao salvar avaliação", description: getErrorMessage(error, 'Não foi possível salvar sua avaliação. Tente novamente.'), variant: "destructive" }),
      }
    );
  };

  const saveAccommodationReview = () => {
    if (!data.accommodation || !accommodationRating) return;
    upsertAccommodationReview.mutate(
      {
        accommodationName: data.accommodation.name,
        cityId: data.city,
        score: accommodationRating,
        comment: accommodationComment || null,
      },
      {
        onSuccess: () => toast({ title: "Avaliação salva!" }),
        onError: (error: Error) =>
          toast({ title: "Erro ao salvar avaliação", description: getErrorMessage(error, 'Não foi possível salvar sua avaliação. Tente novamente.'), variant: "destructive" }),
      }
    );
  };

  const handleShare = async () => {
    if (!user) return;
    setSharing(true);
    try {
      await shareItinerary(user.id, data, richItinerary);
      // Não deixa uma falha de save derrubar o compartilhamento, mas também não
      // anuncia "salvo" se o histórico não recebeu.
      await saveToHistory();
      setShared(true);
      toast(
        savedRef.current
          ? { title: "Roteiro compartilhado e salvo!", description: "Visível na comunidade e no seu histórico." }
          : { title: "Roteiro compartilhado!", description: "Visível na comunidade. O salvamento no histórico falhou — dá para tentar de novo abaixo." }
      );
    } catch (error) {
      toast({ title: "Erro ao compartilhar", description: getErrorMessage(error, 'Não foi possível compartilhar o roteiro. Tente novamente.'), variant: "destructive" });
    }
    setSharing(false);
  };

  const openGoogleMaps = () => {
    const points: string[] = [];
    if (data.accommodation && data.accommodation.id !== "undecided") points.push(`${data.accommodation.lat},${data.accommodation.lng}`);
    data.selectedSpots.forEach((s) => points.push(`${s.lat},${s.lng}`));
    if (points.length === 0) return;
    if (points.length === 1) {
      window.open(`https://www.google.com/maps/search/?api=1&query=${points[0]}`, '_blank', 'noopener,noreferrer');
      return;
    }
    const origin = points[0];
    const dest = points[points.length - 1];
    const waypoints = points.slice(1, -1).join("|");
    window.open(`https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest}&waypoints=${waypoints}&travelmode=walking`, '_blank', 'noopener,noreferrer');
  };

  const exportToPdf = async () => {
    if (!itineraryRef.current) return;
    setExportingPdf(true);
    try {
      await exportElementToPdf(
        itineraryRef.current,
        `roteiro-${slugifyForFileName(data.cityName)}-${data.days}dias`
      );
      toast({ title: "PDF exportado!" });
    } catch (error) {
      toast({ title: "Erro ao exportar PDF", description: getErrorMessage(error, 'Não foi possível exportar o PDF. Tente novamente.'), variant: "destructive" });
    }
    setExportingPdf(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col items-center gap-6 md:gap-8 w-full"
      role="main"
      aria-label="Resumo do roteiro"
    >
      <div ref={itineraryRef} className="flex flex-col items-center gap-6 md:gap-8 w-full">
      <div className="w-12 h-12 md:w-16 md:h-16 rounded-full gradient-pe flex items-center justify-center">
        <Check size={24} className="text-primary-foreground md:hidden" />
        <Check size={32} className="text-primary-foreground hidden md:block" />
      </div>

      <div className="text-center space-y-2">
        <h2 className="text-2xl md:text-4xl font-extrabold tracking-display text-foreground">Roteiro pronto! 🎉</h2>
        <p className="text-muted-foreground text-base md:text-lg">
          {data.days} dia{data.days > 1 ? "s" : ""} em {data.cityName}, PE
        </p>
        {protocol && (
          <p className="text-xs font-bold text-primary tracking-wider" role="status">
            Protocolo {formatProtocol(protocol.protocolNumber, protocol.createdAt)}
          </p>
        )}
      </div>

      {/* Summary Card */}
      <div className="w-full p-4 md:p-6 rounded-2xl border border-border bg-card space-y-3 md:space-y-4" style={{ boxShadow: "var(--card-shadow)" }}>
        <SummaryRow label="Orçamento" value={data.budgetLabel} />
        <SummaryRow label="Adultos" value={`${data.adults}`} />
        {data.children > 0 && <SummaryRow label="Crianças" value={`${data.children}`} />}
        <SummaryRow label="Total passageiros" value={`${data.people} pessoa${data.people > 1 ? "s" : ""}`} />
        {data.isCouple && <SummaryRow label="Tipo" value="💕 Casal" />}
        {data.people > 1 && !data.isCouple && (
          <SummaryRow label="Tipo" value={data.groupType === "couple" ? "Casal" : "Amigos"} />
        )}
        <SummaryRow label="Quartos" value={`${data.rooms}`} />
        <SummaryRow label="Duração" value={`${data.days} dia${data.days > 1 ? "s" : ""}`} />
        <SummaryRow label="Mês" value={monthName(data.month)} />
        <SummaryRow label="Transporte ida" value={transportLabel(data.transportToDestination)} />
        <SummaryRow label="Destino" value={`${data.cityName}, Pernambuco`} />

        {data.selectedSpots.length > 0 && (
          <div className="pt-2 border-t border-border">
            <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Atividades Selecionadas</span>
            <div className="flex flex-wrap gap-2 mt-2">
              {data.selectedSpots.map((s) => (
                <span key={s.id} className="text-xs font-bold px-3 py-1 rounded-full bg-primary/10 text-primary">
                  {s.imageEmoji} {s.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {data.accommodation && data.accommodation.id !== "undecided" && (
          <div className="pt-2 border-t border-border space-y-3">
            <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Hospedagem</span>
            <div className="mt-1">
              <span className="font-bold text-foreground">{data.accommodation.name}</span>
              <span className="text-sm text-muted-foreground block">{data.accommodation.address}</span>
              <span className="text-sm text-primary font-semibold">
                ⭐ {data.accommodation.rating} · R$ {data.accommodation.pricePerNight}/noite · Total: R${" "}
                {(data.accommodation.pricePerNight * data.days).toLocaleString("pt-BR")}
              </span>
              {isSafeExternalUrl(data.accommodation.bookingUrl) && (
                <a
                  href={data.accommodation.bookingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 mt-2 text-xs font-bold px-3 py-1.5 rounded-full bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
                >
                  <ExternalLink size={12} /> Reservar
                </a>
              )}
            </div>
            {user && (
              <div className="p-3 rounded-xl bg-muted/30 space-y-2">
                <span className="text-xs font-bold text-muted-foreground">Avaliar hospedagem</span>
                <StarRating value={accommodationRating} onChange={setAccommodationRating} size={20} />
                <textarea
                  placeholder="Comentário (opcional)"
                  value={accommodationComment}
                  onChange={(e) => setAccommodationComment(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg p-2 text-sm text-foreground placeholder:text-muted-foreground resize-none h-16"
                />
                <Button size="sm" disabled={!accommodationRating || upsertAccommodationReview.isPending} onClick={saveAccommodationReview} className="rounded-full text-xs gap-1">
                  <MessageSquare size={12} /> {upsertAccommodationReview.isPending ? "Salvando..." : "Enviar avaliação"}
                </Button>
              </div>
            )}
          </div>
        )}

        <SummaryRow label="Transporte local" value={localTransportLabel(data.localTransport)} />
        {data.accommodation?.id === "undecided" && <SummaryRow label="Hospedagem" value="Ainda não definida" />}
      </div>

      {/* Map */}
      <div className="w-full space-y-3">
        <div className="flex items-center gap-2">
          <Map size={20} className="text-primary" />
          <span className="font-bold text-foreground">Mapa do roteiro</span>
        </div>
        <TravelMap spots={data.selectedSpots} accommodation={data.accommodation} restaurants={[]} />
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-1 text-xs"><span className="w-3 h-3 rounded-full" style={{ background: "#FF6B35" }} /> Hospedagem</span>
          <span className="flex items-center gap-1 text-xs"><span className="w-3 h-3 rounded-full" style={{ background: "#00B4D8" }} /> Atividades</span>
          <span className="flex items-center gap-1 text-xs"><span className="w-3 h-3 rounded-full" style={{ background: "#E91E63" }} /> Restaurantes</span>
        </div>
      </div>

      {/* Google Maps Link */}
      <button
        onClick={openGoogleMaps}
        className="flex items-center gap-2 px-4 md:px-6 py-3 rounded-full border border-primary text-primary font-bold hover:bg-primary/10 transition-colors text-sm md:text-base"
      >
        <ExternalLink size={16} /> Abrir roteiro no Google Maps
      </button>

      {/* ===== RICH ITINERARY SECTION ===== */}
      <div className="w-full space-y-6">
        <div className="flex items-center gap-2">
          <CalendarDays size={20} className="text-primary" />
          <span className="font-bold text-lg text-foreground">Roteiro dia a dia</span>
        </div>

        {loadingItinerary ? (
          <div className="space-y-4">
            <div className="p-5 rounded-2xl border border-border bg-card space-y-3">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
            {Array.from({ length: Math.min(data.days, 3) }).map((_, i) => (
              <div key={i} className="p-5 rounded-2xl border border-border bg-card space-y-3">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-4 w-56" />
                <div className="space-y-2 ml-4">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-5/6" />
                  <Skeleton className="h-3 w-4/6" />
                </div>
              </div>
            ))}
            <p className="text-sm text-center text-muted-foreground animate-pulse">Gerando roteiro personalizado...</p>
          </div>
        ) : richItinerary ? (
          <div className="space-y-6 md:space-y-8">
            {/* Introduction */}
            <div className="p-4 md:p-6 rounded-2xl bg-primary/5 border border-primary/20">
              <h3 className="text-xl md:text-3xl font-extrabold text-foreground mb-2">{richItinerary.city}</h3>
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed">{richItinerary.introduction}</p>
            </div>

            {/* Festive Alert */}
            {richItinerary.festiveAlert && (
              <div className="p-4 md:p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex gap-3">
                <AlertTriangle size={24} className="text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-foreground">🎉 {richItinerary.festiveAlert.name}</h4>
                  <p className="text-sm text-muted-foreground mt-1">{richItinerary.festiveAlert.description}</p>
                  <span className="inline-block mt-2 text-xs font-bold px-3 py-1 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300">
                    Preços ~{richItinerary.festiveAlert.priceIncrease} acima do normal
                  </span>
                </div>
              </div>
            )}

            {/* Day-by-day */}
            <div className="space-y-3">
              {richItinerary.days?.map((day: RichDay) => (
                <div key={day.day} className="p-4 md:p-5 rounded-2xl border border-border bg-card" style={{ boxShadow: "var(--card-shadow)" }}>
                  <h4 className="font-extrabold text-foreground text-base md:text-lg mb-1">Dia {day.day}</h4>
                  <p className="text-primary font-semibold text-sm mb-1">{day.title}</p>
                  <p className="text-muted-foreground text-sm">{day.summary}</p>

                  <div className="mt-4 space-y-3 border-l-2 border-primary/20 pl-3 md:pl-4 ml-1 md:ml-2">
                    {day.activities?.map((act: RichActivity, j: number) => (
                      <div key={j} className="relative">
                        <div className="absolute -left-[18px] md:-left-[22px] top-1 w-3 h-3 rounded-full bg-primary border-2 border-background" />
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold px-2 py-0.5 rounded bg-primary/10 text-primary">{act.time}</span>
                            <span className="text-xs text-muted-foreground">{act.period}</span>
                            {act.duration && <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock size={10} />{act.duration}</span>}
                          </div>
                          <h5 className="font-bold text-foreground text-sm">{act.title}</h5>
                          <p className="text-xs text-muted-foreground leading-relaxed">{act.description}</p>
                          <div className="flex flex-wrap gap-2 md:gap-3 mt-1">
                            {act.location && <span className="text-xs text-muted-foreground flex items-center gap-1"><MapPin size={10} className="text-primary" /> {act.location}</span>}
                            {act.transport && <span className="text-xs text-muted-foreground flex items-center gap-1"><Navigation size={10} className="text-primary" /> {act.transport}</span>}
                            {act.estimatedCost > 0 && <span className="text-xs text-muted-foreground flex items-center gap-1"><DollarSign size={10} className="text-primary" /> R$ {act.estimatedCost}</span>}
                          </div>
                          {act.tips && (
                            <p className="text-xs text-primary/80 mt-1 flex items-start gap-1">
                              <Lightbulb size={10} className="mt-0.5 shrink-0" /> {act.tips}
                            </p>
                          )}
                          {user && (
                            <div className="mt-2 p-2 rounded-lg bg-muted/20 space-y-1">
                              <StarRating value={activityRatings[act.title] || 0} onChange={(v) => setActivityRatings((p) => ({ ...p, [act.title]: v }))} size={14} />
                              <div className="flex gap-2">
                                <input type="text" placeholder="Comentário..." value={activityComments[act.title] || ""} onChange={(e) => setActivityComments((p) => ({ ...p, [act.title]: e.target.value }))} className="flex-1 bg-background border border-border rounded px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground" />
                                <Button size="sm" variant="ghost" disabled={!activityRatings[act.title] || upsertActivityReview.isPending} onClick={() => saveActivityReview(act.title)} className="text-xs h-7 px-2">
                                  {upsertActivityReview.isPending ? "..." : "Avaliar"}
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Attraction Zones */}
            {richItinerary.attractionZones && richItinerary.attractionZones.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg md:text-2xl font-extrabold text-foreground flex items-center gap-2">
                  <MapPin size={22} className="text-primary" />
                  O que fazer em {richItinerary.city}: os polos de atrações
                </h3>
                {richItinerary.attractionZones.map((zone: AttractionZone, zi: number) => {
                  const isOpen = expandedZones[zi] ?? true;
                  return (
                    <div key={zi} className="rounded-2xl border border-border bg-card overflow-hidden" style={{ boxShadow: "var(--card-shadow)" }}>
                      <button onClick={() => toggleZone(zi)} className="w-full flex items-center justify-between p-4 md:p-5 text-left hover:bg-accent/50 transition-colors">
                        <h4 className="font-extrabold text-foreground text-base md:text-lg">{zone.name}</h4>
                        {isOpen ? <ChevronUp size={20} className="text-muted-foreground" /> : <ChevronDown size={20} className="text-muted-foreground" />}
                      </button>
                      {isOpen && (
                        <div className="px-4 md:px-5 pb-4 md:pb-5 space-y-5">
                          <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-line">{zone.description}</p>
                          {zone.recommendedItinerary && (
                            <div className="p-3 md:p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-2">
                              <h5 className="font-bold text-primary text-sm flex items-center gap-2"><Navigation size={14} /> {zone.recommendedItinerary.title}</h5>
                              <p className="text-xs text-muted-foreground">{zone.recommendedItinerary.arrivalTime}</p>
                              <ol className="list-decimal list-inside space-y-1">
                                {zone.recommendedItinerary.steps.map((step: string, si: number) => (
                                  <li key={si} className="text-sm text-foreground">{step}</li>
                                ))}
                              </ol>
                            </div>
                          )}
                          {zone.highlights?.map((hl: AttractionHighlight, hi: number) => {
                            const hlKey = `${zi}-${hi}`;
                            const hlOpen = expandedHighlights[hlKey] ?? false;
                            return (
                              <div key={hi} className="rounded-xl border border-border overflow-hidden">
                                <button onClick={() => toggleHighlight(hlKey)} className="w-full flex items-center justify-between p-3 md:p-4 text-left hover:bg-accent/30 transition-colors">
                                  <div className="flex items-center gap-2">
                                    <MapPin size={14} className="text-primary shrink-0" />
                                    <span className="font-bold text-foreground text-sm">{hl.name}</span>
                                  </div>
                                  {hlOpen ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
                                </button>
                                {hlOpen && (
                                  <div className="px-3 md:px-4 pb-3 md:pb-4 space-y-3">
                                    <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{hl.description}</p>
                                    {hl.practicalInfo && (
                                      <div className="p-3 rounded-lg bg-muted/50 space-y-1">
                                        <h6 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1"><Info size={10} /> Informações práticas</h6>
                                        {hl.practicalInfo.address && <p className="text-xs text-foreground flex items-center gap-1"><MapPin size={10} className="text-primary" /> {hl.practicalInfo.address}</p>}
                                        {hl.practicalInfo.hours && <p className="text-xs text-foreground flex items-center gap-1"><Clock size={10} className="text-primary" /> {hl.practicalInfo.hours}</p>}
                                        {hl.practicalInfo.price && <p className="text-xs text-foreground flex items-center gap-1"><DollarSign size={10} className="text-primary" /> {hl.practicalInfo.price}</p>}
                                        {hl.practicalInfo.phone && <p className="text-xs text-foreground flex items-center gap-1"><Phone size={10} className="text-primary" /> {hl.practicalInfo.phone}</p>}
                                        {hl.practicalInfo.instagram && <p className="text-xs text-foreground flex items-center gap-1"><Instagram size={10} className="text-primary" /> {hl.practicalInfo.instagram}</p>}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Practical Tips */}
            {richItinerary.practicalTips && richItinerary.practicalTips.length > 0 && (
              <div className="p-4 md:p-5 rounded-2xl border border-border bg-card space-y-3" style={{ boxShadow: "var(--card-shadow)" }}>
                <h4 className="font-extrabold text-foreground flex items-center gap-2">
                  <Lightbulb size={18} className="text-primary" /> Dicas práticas
                </h4>
                <div className="space-y-2">
                  {richItinerary.practicalTips.map((tip, i) => (
                    <div key={i} className="flex gap-2 items-start">
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-primary/10 text-primary shrink-0 mt-0.5">{tip.category}</span>
                      <p className="text-sm text-muted-foreground">{tip.tip}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Cost Breakdown */}
            {computedCostBreakdown && (
              <div className="p-4 md:p-5 rounded-2xl border border-border bg-card space-y-3" style={{ boxShadow: "var(--card-shadow)" }}>
                <h4 className="font-extrabold text-foreground flex items-center gap-2">
                  <DollarSign size={18} className="text-primary" /> Estimativa de custos
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <CostRow label="Hospedagem" value={computedCostBreakdown.accommodation} />
                  <CostRow label="Alimentação" value={computedCostBreakdown.food} />
                  <CostRow label="Transporte" value={computedCostBreakdown.transport} />
                  <CostRow label="Atividades" value={computedCostBreakdown.activities} />
                  <CostRow label="Extras" value={computedCostBreakdown.extras} />
                </div>
                <div className="pt-3 border-t border-border flex justify-between">
                  <span className="font-bold text-foreground">Total estimado</span>
                  <span className="font-extrabold text-primary text-lg">R$ {computedTotal.toLocaleString("pt-BR")}</span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-5 rounded-2xl border border-dashed border-primary/40 bg-primary/5 text-center">
            <p className="text-sm text-muted-foreground">Não foi possível gerar o roteiro automaticamente.</p>
            <Button onClick={handleGenerateItinerary} disabled={loadingItinerary} className="mt-3 gradient-pe border-0 rounded-full font-bold gap-2">
              <CalendarDays size={16} /> Tentar novamente
            </Button>
          </div>
        )}
      </div>

      </div>{/* close itineraryRef wrapper */}

      {/* Actions */}
      <div className="flex flex-col gap-3 w-full max-w-md" role="group" aria-label="Ações do roteiro">
        {richItinerary && (
          <Button onClick={exportToPdf} disabled={exportingPdf} variant="outline" className="w-full rounded-full font-bold gap-2">
            <FileDown size={16} /> {exportingPdf ? "Exportando..." : "Exportar PDF"}
          </Button>
        )}
        {saveState === 'saving' && (
          <p className="text-xs text-center text-muted-foreground" role="status">Salvando no histórico...</p>
        )}
        {saveState === 'saved' && !shared && (
          <p className="text-xs text-center text-muted-foreground" role="status">Salvo automaticamente no histórico</p>
        )}
        {saveState === 'error' && (
          <div className="p-3 rounded-xl border border-destructive/40 bg-destructive/5 space-y-2" role="alert">
            <p className="text-xs text-destructive font-semibold">Não foi possível salvar a viagem no histórico.</p>
            {saveError && <p className="text-[11px] text-muted-foreground break-words">{saveError}</p>}
            <Button size="sm" onClick={saveToHistory} className="w-full rounded-full text-xs font-bold">
              Tentar salvar de novo
            </Button>
          </div>
        )}
        {!shared && (
          <Button onClick={handleShare} disabled={sharing} variant="outline" className="w-full rounded-full font-bold gap-2">
            <Share2 size={16} /> {sharing ? "Compartilhando..." : "Compartilhar roteiro"}
          </Button>
        )}
        {shared && (
          <p className="text-sm text-center text-muted-foreground w-full" role="status">
            Compartilhado na comunidade
            {saveState === 'saved' ? ' e salvo no histórico' : ''}
          </p>
        )}
        <Button variant="outline" size="lg" onClick={onRestart} className="w-full rounded-full gap-2">
          <RotateCcw size={16} /> Nova viagem
        </Button>
      </div>
    </motion.div>
  );
};

const SummaryRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between items-baseline">
    <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{label}</span>
    <span className="text-sm font-semibold text-foreground text-right max-w-[60%]">{value}</span>
  </div>
);

const CostRow = ({ label, value }: { label: string; value: number }) => (
  <div className="flex justify-between items-baseline p-2 rounded-lg bg-muted/30">
    <span className="text-xs text-muted-foreground">{label}</span>
    <span className="text-sm font-bold text-foreground">R$ {value?.toLocaleString("pt-BR")}</span>
  </div>
);

export default StepSummary;
