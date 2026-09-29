import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Users, Minus, Plus, Calendar, Check, Heart, Baby, BedDouble } from "lucide-react";
import { budgetRanges } from "@/data/mockData";

interface StepBudgetProps {
  onNext: (budget: number, budgetLabel: string, people: number, days: number, adults: number, children: number, isCouple: boolean, rooms: number) => void;
}

const StepBudget = ({ onNext }: StepBudgetProps) => {
  const [selectedBudget, setSelectedBudget] = useState<string | null>(null);
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [isCouple, setIsCouple] = useState(false);
  const [rooms, setRooms] = useState(1);
  const [days, setDays] = useState(3);

  const people = adults + children;
  const budgetData = budgetRanges.find(b => b.id === selectedBudget);
  const canProceed = selectedBudget && adults >= 1 && days >= 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col items-center gap-4"
    >
      <div className="text-center space-y-1">
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-display text-foreground">
          Sua viagem começa <span className="gradient-text">no seu bolso.</span>
        </h1>
        <p className="text-muted-foreground text-sm">Selecione a faixa de orçamento por pessoa</p>
      </div>

      {/* Budget ranges - compact */}
      <div className="grid gap-2 w-full max-w-lg">
        {budgetRanges.map((b, i) => (
          <motion.button
            key={b.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04, duration: 0.3 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setSelectedBudget(b.id)}
            className={`flex items-center gap-3 p-2.5 rounded-xl border text-left transition-all ${
              selectedBudget === b.id
                ? 'border-primary bg-primary/10 shadow-md'
                : 'border-border bg-card hover:border-primary/30'
            }`}
          >
            <span className="text-xl">{b.emoji}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-foreground">{b.label}</span>
                <span className="text-[10px] font-semibold text-primary">{b.range}</span>
              </div>
              <span className="text-[10px] text-muted-foreground line-clamp-1">{b.description}</span>
            </div>
            {selectedBudget === b.id && (
              <div className="w-5 h-5 rounded-full gradient-pe flex items-center justify-center flex-shrink-0">
                <Check size={12} className="text-primary-foreground" />
              </div>
            )}
          </motion.button>
        ))}
      </div>

      {/* All counters in a single compact grid */}
      <div className="w-full max-w-lg space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Adults */}
          <CounterField label="Adultos" icon={Users} value={adults} min={1} onChange={setAdults} />
          {/* Children */}
          <CounterField label="Crianças" icon={Baby} value={children} min={0} onChange={setChildren} />
          {/* Rooms */}
          <CounterField label="Quartos" icon={BedDouble} value={rooms} min={1} onChange={setRooms} />
          {/* Days */}
          <CounterField label="Dias" icon={Calendar} value={days} min={1} onChange={setDays} />
        </div>

        {/* Couple toggle - inline */}
        {adults >= 2 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-center">
            <button
              onClick={() => setIsCouple(!isCouple)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-bold transition-all ${
                isCouple ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-card text-muted-foreground hover:border-primary/30'
              }`}
            >
              <Heart size={14} className={isCouple ? 'fill-primary' : ''} />
              Viagem de casal
              {isCouple && <Check size={12} />}
            </button>
          </motion.div>
        )}

        {/* Summary line */}
        <div className="text-center text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">{people}</span> passageiro{people > 1 ? 's' : ''} ({adults} adulto{adults > 1 ? 's' : ''}{children > 0 ? `, ${children} criança${children > 1 ? 's' : ''}` : ''}) · <span className="font-semibold text-foreground">{rooms}</span> quarto{rooms > 1 ? 's' : ''} · <span className="font-semibold text-foreground">{days}</span> dia{days > 1 ? 's' : ''}
          {isCouple && (
            <span className="text-primary font-semibold inline-flex items-center gap-1">
              {' · '}
              <Heart size={11} className="fill-primary" /> Casal
            </span>
          )}
        </div>
      </div>

      <Button
        disabled={!canProceed}
        onClick={() => budgetData && onNext(budgetData.max, budgetData.label, people, days, adults, children, isCouple, rooms)}
        className="w-full max-w-xs h-12 rounded-full text-base font-bold gradient-pe border-0 shadow-lg"
      >
        Continuar
      </Button>
    </motion.div>
  );
};

/* Reusable compact counter */
function CounterField({ label, icon: Icon, value, min, onChange }: {
  label: string; icon: React.ElementType; value: number; min: number; onChange: (v: number) => void;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <button onClick={() => onChange(Math.max(min, value - 1))} className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-colors text-primary">
          <Minus size={14} />
        </button>
        <div className="flex items-center gap-1.5">
          <Icon size={14} className="text-primary" />
          <span className="text-xl font-extrabold tabular-nums text-foreground">{value}</span>
        </div>
        <button onClick={() => onChange(value + 1)} className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-colors text-primary">
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
}

export default StepBudget;
