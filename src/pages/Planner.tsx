import { useEffect, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useRequireAuth } from "@/hooks/use-require-auth";
import BudgetBar from "@/components/BudgetBar";
import StepBudget from "@/components/StepBudget";
import StepMonth from "@/components/StepMonth";
import StepTransportArrival from "@/components/StepTransportArrival";
import StepCity from "@/components/StepCity";
import StepAccommodation from "@/components/StepAccommodation";
import StepLocalTransport from "@/components/StepLocalTransport";
import StepSummary from "@/components/StepSummary";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Navigation } from "lucide-react";
import type { TravelState, TouristSpot, AccommodationDetail } from "@/types/travel";
import Seo from "@/components/Seo";
import {
  usePlannerProgress, useSavePlannerProgress, useClearPlannerProgress, useRecordPlannerStepEvent,
  type PlannerStepName,
} from "@/data/plannerProgress";

type StepName = PlannerStepName;

const initialState: TravelState = {
  budget: 0, budgetLabel: '', people: 1, adults: 1, children: 0, isCouple: false, rooms: 1, days: 3, groupType: "solo",
  month: null, transportToDestination: null, city: "", cityName: "",
  selectedSpots: [], accommodation: null, localTransport: null,
};

const Planner = () => {
  const { loading: authLoading } = useRequireAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState<StepName>('budget');
  const [data, setData] = useState<TravelState>(initialState);
  const [preSelectedCity, setPreSelectedCity] = useState<string | undefined>();
  const [ready, setReady] = useState(false);

  // Rascunho salvo no banco (tabela planner_progress), amarrado à conta —
  // sobrevive a reload, troca de dispositivo e logout/login, ao contrário de
  // sessionStorage.
  const { data: savedProgress, isError: progressError } = usePlannerProgress();
  const saveProgress = useSavePlannerProgress();
  const clearProgress = useClearPlannerProgress();
  const recordStepEvent = useRecordPlannerStepEvent();
  const restoredRef = useRef(false);
  const recordedStepsRef = useRef<Set<StepName>>(new Set());

  // Restaura o rascunho uma única vez, assim que a consulta resolve (dado ou
  // erro). `savedProgress === undefined` significa "ainda carregando" — só aí
  // distinguimos de `null` (carregou e não havia rascunho).
  useEffect(() => {
    if (restoredRef.current || (savedProgress === undefined && !progressError)) return;
    restoredRef.current = true;
    if (savedProgress) {
      setData(savedProgress.data);
      setStep(savedProgress.step);
    }
    setReady(true);
  }, [savedProgress, progressError]);

  // Persiste a cada troca de etapa — só depois de `ready`, para não
  // sobrescrever um rascunho recém-restaurado com o estado inicial no
  // primeiro render.
  useEffect(() => {
    if (!ready) return;
    if (step === 'summary') {
      clearProgress.mutate();
      return;
    }
    if (step !== 'budget' || data.budget > 0) {
      saveProgress.mutate({ step, data });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, data, ready]);

  // Funil de abandono (painel admin): registra a etapa uma única vez, mesmo
  // que `data` mude várias vezes dentro dela — por isso um efeito separado
  // do de cima, sem `data` nas dependências.
  useEffect(() => {
    if (!ready || recordedStepsRef.current.has(step)) return;
    recordedStepsRef.current.add(step);
    recordStepEvent.mutate(step);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, ready]);

  useEffect(() => { const c = searchParams.get('city'); if (c) setPreSelectedCity(c); }, [searchParams]);

  const getSteps = (): StepName[] => {
    return ['budget', 'month', 'transport-arrival', 'city', 'accommodation', 'local-transport', 'summary'];
  };

  const goBack = () => { const s = getSteps(); const i = s.indexOf(step); if (i > 0) setStep(s[i - 1]); };

  const handleBudget = (budget: number, budgetLabel: string, people: number, days: number, adults: number, children: number, isCouple: boolean, rooms: number) => {
    const groupType = people === 1 ? "solo" : isCouple ? "couple" : "friends";
    setData(d => ({ ...d, budget, budgetLabel, people, days, adults, children, isCouple, rooms, groupType }));
    setStep('month');
  };
  const handleMonth = (month: number) => { setData(d => ({ ...d, month })); setStep('transport-arrival'); };
  const handleTransportArrival = (transport: string) => { setData(d => ({ ...d, transportToDestination: transport })); setStep('city'); };
  const handleCity = (cityId: string, cityName: string, spots: TouristSpot[]) => { setData(d => ({ ...d, city: cityId, cityName, selectedSpots: spots })); setStep('accommodation'); };
  const handleAccommodation = (accommodation: AccommodationDetail) => { setData(d => ({ ...d, accommodation })); setStep('local-transport'); };
  const handleLocalTransport = (transport: string) => { setData(d => ({ ...d, localTransport: transport })); setStep('summary'); };
  const handleRestart = () => {
    setData(initialState);
    setStep('budget');
    clearProgress.mutate();
  };

  const activeSteps = getSteps();
  const currentIdx = activeSteps.indexOf(step);

  if (authLoading || !ready) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Seo title="Planejar viagem — TRIPSMART" description="Monte um roteiro personalizado em Pernambuco com IA: orçamento, cidades, hospedagem e atividades." path="/#/planejar" />
      <div className="sticky top-0 z-50 bg-pe-navy border-b border-pe-blue/20 px-3 md:px-6 py-2 md:py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => step === 'budget' ? navigate('/') : goBack()} className="gap-1.5 text-white/80 hover:text-white hover:bg-white/10 text-xs md:text-sm px-2 md:px-3">
            <ArrowLeft size={14} /> <span className="hidden sm:inline">{step === 'budget' ? 'Voltar' : 'Anterior'}</span>
          </Button>
          <button onClick={() => navigate('/')} className="flex items-center gap-1.5 md:gap-2 hover:opacity-80 transition-opacity">
            <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-pe-gold flex items-center justify-center">
              <Navigation size={12} className="text-pe-navy md:hidden" />
              <Navigation size={14} className="text-pe-navy hidden md:block" />
            </div>
            <span className="font-black text-xs md:text-sm text-white">TRIP<span className="text-pe-gold">SMART</span></span>
          </button>
          {data.budget > 0 && (
            <div className="w-24 sm:w-48">
              <BudgetBar total={data.budget} spent={0} />
            </div>
          )}
        </div>
      </div>

      {step !== 'summary' && step !== 'budget' && (
        <div className="flex justify-center items-center gap-1.5 pt-4 md:pt-5 pb-2 md:pb-3 px-4 md:px-6 overflow-x-auto">
          {activeSteps.map((s, i) => (
            <div key={s} className={`h-1.5 md:h-2 rounded-full transition-all flex-shrink-0 ${i <= currentIdx ? 'w-5 md:w-7 bg-pe-gold' : 'w-2 md:w-3 bg-border'}`} />
          ))}
        </div>
      )}

      <div className="flex-1 flex items-start justify-center px-4 md:px-6 py-6 md:py-10 overflow-y-auto">
        <div className="w-full max-w-3xl">
          <AnimatePresence mode="wait">
            {step === 'budget' && <StepBudget key="budget" onNext={handleBudget} />}
            {step === 'month' && <StepMonth key="month" onNext={handleMonth} />}
            {step === 'transport-arrival' && <StepTransportArrival key="transport" onNext={handleTransportArrival} />}
            {step === 'city' && (
              <StepCity key="city" month={data.month} budget={data.budget} budgetLabel={data.budgetLabel}
                people={data.people} days={data.days} transportToDestination={data.transportToDestination}
                preSelectedCity={preSelectedCity} onNext={handleCity} />
            )}
            {step === 'accommodation' && (
              <StepAccommodation key="accommodation" cityId={data.city} cityName={data.cityName}
                selectedSpots={data.selectedSpots} budget={data.budget} budgetLabel={data.budgetLabel}
                people={data.people} days={data.days} month={data.month}
                transportToDestination={data.transportToDestination} onNext={handleAccommodation} />
            )}
            {step === 'local-transport' && <StepLocalTransport key="local-transport" onNext={handleLocalTransport} />}
            {step === 'summary' && <StepSummary key="summary" data={data} onRestart={handleRestart} />}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default Planner;
