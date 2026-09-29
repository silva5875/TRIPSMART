import { motion } from "framer-motion";
import { HelpCircle } from "lucide-react";
import { localTransportOptions } from "@/data/mockData";

interface StepLocalTransportProps {
  onNext: (transport: string) => void;
}

const StepLocalTransport = ({ onNext }: StepLocalTransportProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col items-center gap-8"
      role="region"
      aria-label="Seleção do transporte local"
    >
      <div className="text-center space-y-2">
        <h2 className="text-3xl md:text-4xl font-extrabold tracking-display text-foreground">
          Como vai se locomover?
        </h2>
        <p className="text-muted-foreground text-lg">Transporte local no destino</p>
      </div>

      <div className="grid gap-3 w-full max-w-md" role="group" aria-label="Opções de transporte local">
        {localTransportOptions.map((t, i) => (
          <motion.button
            key={t.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08, duration: 0.4 }}
            whileHover={{ y: -4 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onNext(t.id)}
            aria-label={`${t.label}: ${t.desc}, custo médio ${t.avgCost}, tempo médio ${t.avgTime}`}
            className="flex items-center gap-4 p-5 rounded-2xl border border-border bg-card text-left hover:border-primary/40 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            style={{ boxShadow: 'var(--card-shadow)' }}
          >
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0" aria-hidden="true">
              <t.icon size={22} className="text-primary" />
            </div>
            <div className="flex-1">
              <span className="font-bold text-foreground block">{t.label}</span>
              <span className="text-sm text-muted-foreground block">{t.desc}</span>
              <div className="flex gap-4 mt-1">
                <span className="text-xs font-semibold text-primary">{t.avgCost}</span>
                <span className="text-xs text-muted-foreground">~{t.avgTime}</span>
              </div>
            </div>
          </motion.button>
        ))}

        {/* Ainda não sei */}
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: localTransportOptions.length * 0.08, duration: 0.4 }}
          whileHover={{ y: -4 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onNext("undecided")}
          aria-label="Ainda não sei como vou me locomover"
          className="flex items-center gap-4 p-5 rounded-2xl border border-dashed border-muted-foreground/40 bg-muted/30 text-left hover:border-primary/40 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <HelpCircle size={28} className="text-muted-foreground" aria-hidden="true" />
          <div>
            <span className="font-bold text-muted-foreground block">Ainda não sei</span>
            <span className="text-sm text-muted-foreground">Decido depois</span>
          </div>
        </motion.button>
      </div>
    </motion.div>
  );
};

export default StepLocalTransport;
