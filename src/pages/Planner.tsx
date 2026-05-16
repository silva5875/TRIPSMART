import { useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
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

type StepName = 'budget' | 'month' | 'transport-arrival' | 'city' | 'accommodation' | 'local-transport' | 'summary';

const STORAGE_KEY = "planner-state";

const initialState: TravelState = {
  budget: 0, budgetLabel: '', people: 1, adults: 1, children: 0, isCouple: false, rooms: 1, days: 3, groupType: "solo",
  month: null, transportToDestination: null, city: "", cityName: "",
  selectedSpots: [], accommodation: null, localTransport: null,
};

const Planner = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState<StepName>('budget');
  const [data, setData] = useState<TravelState>(initialState);
  const [preSelectedCity, setPreSelectedCity] = useState<string | undefined>();

  // Restore state from sessionStorage
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.data && parsed.step) {
          setData(parsed.data);
          setStep(parsed.step);
        }
      }
    } catch {}
  }, []);

  // Persist state to sessionStorage (exclude summary step)
  useEffect(() => {
    if (step === 'summary') {
      sessionStorage.removeItem(STORAGE_KEY);
      return;
    }
    if (step !== 'budget' || data.budget > 0) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ step, data }));
    }
  }, [step, data]);

  useEffect(() => { if (!loading && !user) navigate('/auth'); }, [user, loading]);
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
    sessionStorage.removeItem(STORAGE_KEY);
  };

  const activeSteps = getSteps();
  const currentIdx = activeSteps.indexOf(step);

  if (loading) return null;

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
