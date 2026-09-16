import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import AppHeader from "@/components/AppHeader";
import {
  Compass, AlertTriangle, Lock,
  MapPin, Sparkles, Crown, CreditCard, Clock, DollarSign,
  ChevronDown, ChevronUp, Footprints, Info, Lightbulb,
  Calendar, Users, ArrowUp,
} from "lucide-react";
import { budgetRanges, monthNames, pernambucoCities } from "@/data/mockData";
import { generateRichItinerary } from "@/data/catalog";
import { budgetLabel as budgetLabelFor } from "@/lib/format";
import { getErrorMessage } from "@/lib/errors";
import type { RichItinerary } from "@/types/richItinerary";
import { toast } from "sonner";
import Seo from "@/components/Seo";

const RouteGenerator = () => {
  const [selectedCity, setSelectedCity] = useState("");
  const [selectedMonth, setSelectedMonth] = useState<number>(0);
  const [budget, setBudget] = useState("");
  const [days, setDays] = useState(3);
  const [people, setPeople] = useState(1);
  const [groupType, setGroupType] = useState("solo");

  const [itinerary, setItinerary] = useState<RichItinerary | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [expandedZones, setExpandedZones] = useState<Record<number, boolean>>({});
  const [showBackToTop, setShowBackToTop] = useState(false);

  const isFestive = selectedMonth === 2 || selectedMonth === 6;
  const festiveName = selectedMonth === 2 ? "Carnaval" : "São João";

  // Derivado de `budget`, não guardado em paralelo: antes, editar o número
  // manualmente depois de clicar num botão de faixa deixava o rótulo antigo
  // ("Confortável") apontando para um valor que não era mais o budget atual
  // — e esse par incoerente ia para a IA (paga) que gera o roteiro.
  const budgetLabel = budget ? budgetLabelFor(Number(budget)) : "";

  const handleGenerate = async () => {
    const cityObj = pernambucoCities.find((c) => c.id === selectedCity);
    if (!cityObj || !selectedMonth || !budget) return;

    setLoading(true);
    setItinerary(null);
    try {
      const result = await generateRichItinerary({
        cityName: cityObj.name,
        cityId: cityObj.id,
        days,
        month: selectedMonth,
        budget: Number(budget),
        budgetLabel,
        people,
        groupType,
      });

      setItinerary(result);
      setShowPaywall(true);
      setUnlocked(false);
    } catch (err) {
      toast.error(getErrorMessage(err, "Não foi possível gerar o roteiro. Tente novamente."));
    } finally {
      setLoading(false);
    }
  };

  const handleUnlock = () => {
    setUnlocked(true);
    setShowPaywall(false);
  };

  const toggleZone = (i: number) => {
    setExpandedZones((prev) => ({ ...prev, [i]: !prev[i] }));
  };

  const isFormValid = selectedCity && selectedMonth > 0 && Number(budget) > 0;

  // Antes isto rodava no corpo do componente, sem cleanup: cada render
  // registrava mais um listener, e o próprio listener causava render.
  useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > 600);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const periodColor = (period: string) => {
    if (period === "Manhã") return "bg-pe-gold/20 text-pe-gold border-pe-gold/30";
    if (period === "Tarde") return "bg-pe-blue/20 text-pe-blue border-pe-blue/30";
    return "bg-pe-navy/20 text-pe-navy dark:text-pe-cream border-pe-navy/30";
  };

  return (
    <div className="min-h-screen bg-background">
      <Seo title="Gerador de roteiro editorial — TRIPSMART" description="Roteiros narrativos, completos e ilustrados para sua viagem em Pernambuco." path="/#/gerador" />
      <AppHeader />

      <div className="max-w-4xl mx-auto px-6 py-12 space-y-10">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-pe-blue flex items-center justify-center mx-auto">
            <Sparkles size={28} className="text-white" />
          </div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-foreground">
            Gerador de <span className="text-pe-blue">Roteiros</span>
          </h1>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Roteiros editoriais completos gerados por IA com contexto histórico, itinerários detalhados e dicas práticas.
          </p>
        </motion.div>

        {/* Form */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="p-6 rounded-2xl border border-border bg-card space-y-6" style={{ boxShadow: "var(--card-shadow)" }}>

          {/* City */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <MapPin size={12} /> Destino em PE
            </Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {pernambucoCities.map((city) => (
                <button key={city.id} onClick={() => setSelectedCity(city.id)}
                  className={`p-3 rounded-xl text-sm font-bold text-left transition-all border ${
                    selectedCity === city.id ? "bg-pe-blue text-white border-pe-blue" : "bg-background border-border text-foreground hover:border-pe-blue/40"
                  }`}>
                  <span className="mr-1.5">{city.imageEmoji}</span>{city.name}
                </button>
              ))}
            </div>
          </div>

          {/* Month */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Calendar size={12} /> Mês da viagem
            </Label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {monthNames.map((m, i) => (
                <button key={m} onClick={() => setSelectedMonth(i + 1)}
                  className={`p-2.5 rounded-xl text-xs font-bold transition-all border ${
                    selectedMonth === i + 1 ? "bg-pe-gold text-pe-navy border-pe-gold" : "bg-background border-border text-foreground hover:border-pe-gold/40"
                  } ${(i + 1 === 2 || i + 1 === 6) ? "ring-1 ring-pe-red/30" : ""}`}>
                  {m}
                  {(i + 1 === 2 || i + 1 === 6) && <span className="block text-[10px] text-pe-red mt-0.5">🎉 Festivo</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Days + People + Group */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Dias</Label>
              <Input type="number" value={days} onChange={(e) => setDays(Math.max(1, Math.min(14, Number(e.target.value))))}
                className="h-12 rounded-xl text-lg font-bold" min={1} max={14} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Users size={12} /> Pessoas
              </Label>
              <Input type="number" value={people} onChange={(e) => setPeople(Math.max(1, Number(e.target.value)))}
                className="h-12 rounded-xl text-lg font-bold" min={1} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Grupo</Label>
              <select value={groupType} onChange={(e) => setGroupType(e.target.value)}
                className="w-full h-12 rounded-xl border border-border bg-background px-3 text-sm font-bold text-foreground">
                <option value="solo">Solo</option>
                <option value="casal">Casal</option>
                <option value="familia">Família</option>
                <option value="amigos">Amigos</option>
              </select>
            </div>
          </div>

          {/* Budget */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <DollarSign size={12} /> Orçamento
            </Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {budgetRanges.map((b) => (
                <button key={b.id} onClick={() => setBudget(String(b.max))}
                  className={`p-3 rounded-xl text-sm font-bold text-left transition-all border ${
                    budgetLabel === b.label ? "bg-pe-gold text-pe-navy border-pe-gold" : "bg-background border-border text-foreground hover:border-pe-gold/40"
                  }`}>
                  <span className="mr-1">{b.emoji}</span> {b.label}
                  <span className="block text-[10px] mt-0.5 opacity-70">{b.range}</span>
                </button>
              ))}
            </div>
            <Input type="number" value={budget} onChange={(e) => setBudget(e.target.value)}
              placeholder="Ou digite um valor exato (R$)" className="h-10 rounded-xl text-sm mt-2" min={100} />
          </div>

          {/* Festive Alert */}
          <AnimatePresence>
            {isFestive && selectedMonth > 0 && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <div className="p-4 rounded-xl bg-pe-red/10 border border-pe-red/30 flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-pe-red flex items-center justify-center flex-shrink-0">
                    <AlertTriangle size={20} className="text-white" />
                  </div>
                  <div>
                    <h4 className="font-bold text-foreground text-sm">🎊 Alerta — {festiveName}</h4>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      {selectedMonth === 2
                        ? "Fevereiro é mês de Carnaval em Pernambuco! Espere preços 30-60% mais elevados. Reserve com antecedência."
                        : "Junho é mês de São João em Pernambuco! Os festejos elevam os preços em 20-50%. Planeje com antecedência!"}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Generate button */}
          <Button onClick={handleGenerate} disabled={!isFormValid || loading}
            className="w-full h-14 bg-pe-blue hover:bg-pe-blue/90 text-white border-0 rounded-full text-lg font-bold gap-2">
            {loading ? (
              <><span className="animate-spin">⏳</span> Gerando roteiro com IA...</>
            ) : (
              <><Compass size={22} /> Gerar Roteiro Editorial</>
            )}
          </Button>
        </motion.div>

        {/* ========== ITINERARY RESULT ========== */}
        <AnimatePresence>
          {itinerary && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">

              {/* City Header */}
              <div className="text-center space-y-3">
                <h2 className="text-4xl font-black text-foreground">{itinerary.city}</h2>
                <p className="text-muted-foreground max-w-2xl mx-auto text-sm leading-relaxed">{itinerary.introduction}</p>
              </div>

              {/* Festive Alert from AI */}
              {itinerary.festiveAlert && (
                <div className="p-5 rounded-2xl bg-pe-red/10 border-2 border-pe-red/30">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-xl bg-pe-red flex items-center justify-center flex-shrink-0">
                      <AlertTriangle size={24} className="text-white" />
                    </div>
                    <div>
                      <h3 className="font-black text-foreground">🎊 Ciclo Festivo — {itinerary.festiveAlert.name}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{itinerary.festiveAlert.description}</p>
                      <span className="inline-block mt-2 px-3 py-1 rounded-full bg-pe-red/20 text-pe-red text-xs font-bold">
                        Aumento de {itinerary.festiveAlert.priceIncrease} nos preços
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Content area with blur/paywall */}
              <div className="relative">
                <div className={`space-y-6 transition-all ${showPaywall && !unlocked ? "blur-md pointer-events-none select-none" : ""}`}>

                  {/* ===== DAY-BY-DAY ===== */}
                  <div className="space-y-4">
                    <h3 className="text-2xl font-black text-foreground flex items-center gap-2">
                      <Calendar size={22} className="text-pe-blue" /> Roteiro Dia a Dia
                    </h3>
                    {itinerary.days?.map((day) => (
                      <motion.div key={day.day} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: day.day * 0.08 }}
                        className="rounded-2xl border border-border bg-card overflow-hidden" style={{ boxShadow: "var(--card-shadow)" }}>
                        {/* Day header */}
                        <div className="px-5 py-4 bg-pe-blue/5 border-b border-border flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-pe-gold flex items-center justify-center text-pe-navy font-black text-lg">
                            D{day.day}
                          </div>
                          <div>
                            <h4 className="text-lg font-bold text-foreground">{day.title}</h4>
                            <p className="text-xs text-muted-foreground">{day.summary}</p>
                          </div>
                        </div>
                        {/* Activities */}
                        <div className="p-5 space-y-4">
                          {day.activities?.map((act, ai) => (
                            <div key={ai} className="flex gap-4">
                              {/* Timeline dot */}
                              <div className="flex flex-col items-center">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${periodColor(act.period)}`}>
                                  <Clock size={16} />
                                </div>
                                {ai < (day.activities?.length || 0) - 1 && (
                                  <div className="w-0.5 flex-1 bg-border mt-1" />
                                )}
                              </div>
                              {/* Content */}
                              <div className="flex-1 pb-4">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xs font-bold text-pe-blue">{act.time}</span>
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${periodColor(act.period)}`}>{act.period}</span>
                                  {act.duration && <span className="text-[10px] text-muted-foreground">⏱ {act.duration}</span>}
                                </div>
                                <h5 className="font-bold text-foreground text-sm">{act.title}</h5>
                                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{act.description}</p>
                                <div className="flex flex-wrap gap-2 mt-2">
                                  {act.address && (
                                    <span className="text-[10px] px-2 py-1 rounded-lg bg-muted text-muted-foreground flex items-center gap-1">
                                      <MapPin size={10} /> {act.address}
                                    </span>
                                  )}
                                  {act.estimatedCost > 0 && (
                                    <span className="text-[10px] px-2 py-1 rounded-lg bg-pe-gold/10 text-pe-gold font-bold">
                                      ~R$ {act.estimatedCost}
                                    </span>
                                  )}
                                  {act.transport && (
                                    <span className="text-[10px] px-2 py-1 rounded-lg bg-pe-blue/10 text-pe-blue flex items-center gap-1">
                                      <Footprints size={10} /> {act.transport}
                                    </span>
                                  )}
                                </div>
                                {act.tips && (
                                  <p className="text-[10px] text-pe-gold mt-2 flex items-start gap-1">
                                    <Lightbulb size={10} className="mt-0.5 flex-shrink-0" /> {act.tips}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {/* ===== ATTRACTION ZONES ===== */}
                  {itinerary.attractionZones && itinerary.attractionZones.length > 0 && (
                    <div className="space-y-4">
                      <h3 className="text-2xl font-black text-foreground flex items-center gap-2">
                        <MapPin size={22} className="text-pe-red" /> Polos de Atrações
                      </h3>
                      {itinerary.attractionZones.map((zone, zi) => (
                        <div key={zi} className="rounded-2xl border border-border bg-card overflow-hidden" style={{ boxShadow: "var(--card-shadow)" }}>
                          <button onClick={() => toggleZone(zi)}
                            className="w-full px-5 py-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                            <div className="text-left">
                              <h4 className="text-lg font-bold text-foreground">{zone.name}</h4>
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{zone.description?.substring(0, 120)}...</p>
                            </div>
                            {expandedZones[zi] ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                          </button>

                          <AnimatePresence>
                            {expandedZones[zi] && (
                              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                <div className="px-5 pb-5 space-y-4">
                                  {/* Full description */}
                                  <p className="text-sm text-muted-foreground leading-relaxed">{zone.description}</p>

                                  {/* Recommended Itinerary */}
                                  {zone.recommendedItinerary && (
                                    <div className="p-4 rounded-xl bg-pe-blue/5 border border-pe-blue/20">
                                      <h5 className="font-bold text-pe-blue text-sm mb-1">{zone.recommendedItinerary.title}</h5>
                                      <p className="text-[10px] text-muted-foreground mb-2">{zone.recommendedItinerary.arrivalTime}</p>
                                      <ol className="space-y-1.5">
                                        {zone.recommendedItinerary.steps?.map((step, si) => (
                                          <li key={si} className="text-xs text-foreground flex items-start gap-2">
                                            <span className="w-5 h-5 rounded-full bg-pe-blue text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">
                                              {si + 1}
                                            </span>
                                            {step}
                                          </li>
                                        ))}
                                      </ol>
                                    </div>
                                  )}

                                  {/* Highlights */}
                                  {zone.highlights?.map((h, hi) => (
                                    <div key={hi} className="p-4 rounded-xl border border-border bg-background space-y-2">
                                      <h5 className="font-bold text-foreground">{h.name}</h5>
                                      <p className="text-xs text-muted-foreground leading-relaxed">{h.description}</p>
                                      {h.practicalInfo && (
                                        <div className="p-3 rounded-lg bg-muted/50 space-y-1">
                                          <p className="text-[10px] font-bold text-foreground flex items-center gap-1">
                                            <Info size={10} /> Informações Práticas
                                          </p>
                                          {h.practicalInfo.address && <p className="text-[10px] text-muted-foreground">📍 {h.practicalInfo.address}</p>}
                                          {h.practicalInfo.hours && <p className="text-[10px] text-muted-foreground">🕐 {h.practicalInfo.hours}</p>}
                                          {h.practicalInfo.price && <p className="text-[10px] text-muted-foreground">💰 {h.practicalInfo.price}</p>}
                                          {h.practicalInfo.phone && <p className="text-[10px] text-muted-foreground">📞 {h.practicalInfo.phone}</p>}
                                          {h.practicalInfo.instagram && <p className="text-[10px] text-muted-foreground">📸 {h.practicalInfo.instagram}</p>}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* ===== PRACTICAL TIPS ===== */}
                  {itinerary.practicalTips && itinerary.practicalTips.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-2xl font-black text-foreground flex items-center gap-2">
                        <Lightbulb size={22} className="text-pe-gold" /> Dicas Práticas
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {itinerary.practicalTips.map((tip, ti) => (
                          <div key={ti} className="p-4 rounded-xl border border-border bg-card flex items-start gap-3">
                            <div className="w-8 h-8 rounded-lg bg-pe-gold/20 flex items-center justify-center flex-shrink-0">
                              <Lightbulb size={14} className="text-pe-gold" />
                            </div>
                            <div>
                              <span className="text-[10px] font-bold text-pe-blue uppercase">{tip.category}</span>
                              <p className="text-xs text-muted-foreground mt-0.5">{tip.tip}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ===== COST BREAKDOWN ===== */}
                  {itinerary.costBreakdown && (
                    <div className="p-5 rounded-2xl bg-pe-gold/10 border border-pe-gold/30">
                      <h3 className="text-lg font-black text-foreground mb-3 flex items-center gap-2">
                        <DollarSign size={20} className="text-pe-gold" /> Estimativa de Custos
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
                        {Object.entries(itinerary.costBreakdown).map(([key, val]) => {
                          const labels: Record<string, string> = {
                            accommodation: "🏨 Hospedagem",
                            food: "🍽️ Alimentação",
                            transport: "🚗 Transporte",
                            activities: "🎯 Atividades",
                            extras: "🛍️ Extras",
                          };
                          return (
                            <div key={key} className="text-center p-3 rounded-xl bg-background border border-border">
                              <p className="text-[10px] text-muted-foreground">{labels[key] || key}</p>
                              <p className="text-lg font-black text-foreground mt-1">R$ {(val as number).toLocaleString("pt-BR")}</p>
                            </div>
                          );
                        })}
                      </div>
                      <div className="text-center pt-3 border-t border-pe-gold/30">
                        <p className="text-sm text-muted-foreground">Total estimado</p>
                        <p className="text-3xl font-black text-foreground">
                          R$ {itinerary.estimatedTotalCost?.toLocaleString("pt-BR")}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          para {itinerary.days?.length || days} dias em {itinerary.city} • {people} pessoa(s)
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* ===== PAYWALL OVERLAY ===== */}
                {showPaywall && !unlocked && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="absolute inset-0 flex items-center justify-center">
                    <div className="p-8 rounded-2xl bg-card border-2 border-pe-gold shadow-2xl max-w-md mx-auto text-center space-y-5">
                      <div className="w-16 h-16 rounded-full bg-pe-gold/20 flex items-center justify-center mx-auto">
                        <Lock size={28} className="text-pe-gold" />
                      </div>
                      <h3 className="text-xl font-black text-foreground">Roteiro Gerado com Sucesso!</h3>
                      <p className="text-sm text-muted-foreground">
                        Desbloqueie o roteiro editorial completo com itinerários detalhados, polos de atrações e dicas práticas.
                      </p>
                      <div className="space-y-3">
                        <Button onClick={handleUnlock}
                          className="w-full h-12 bg-pe-blue hover:bg-pe-blue/90 text-white border-0 rounded-full font-bold gap-2">
                          <CreditCard size={18} /> Liberar este roteiro — R$ 12
                        </Button>
                        <Button onClick={handleUnlock}
                          className="w-full h-12 bg-pe-gold hover:bg-pe-gold/90 text-pe-navy border-0 rounded-full font-bold gap-2">
                          <Crown size={18} /> Assinar VIP — R$ 20/mês
                        </Button>
                        <p className="text-[10px] text-muted-foreground">Roteiros ilimitados gerados por IA</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Back to top */}
      <AnimatePresence>
        {showBackToTop && (
          <motion.button initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="fixed bottom-6 right-6 w-12 h-12 rounded-full bg-pe-blue text-white shadow-lg flex items-center justify-center hover:bg-pe-blue/90 transition-colors z-50">
            <ArrowUp size={20} />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
};

export default RouteGenerator;
