import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ThemeToggle from '@/components/ThemeToggle';

interface AppHeaderProps {
  /** Rótulo do botão de voltar. Padrão: "Início". */
  backLabel?: string;
  /** Destino do botão de voltar. Padrão: a home. */
  backTo?: string;
}

/** Barra de navegação padrão. Antes estava copiada em 4 páginas, com classes divergentes. */
const AppHeader = ({ backLabel = 'Início', backTo = '/' }: AppHeaderProps) => {
  const navigate = useNavigate();

  return (
    <nav className="sticky top-0 z-50 bg-pe-navy border-b border-pe-blue/20">
      <div className="max-w-7xl mx-auto px-4 md:px-6 h-14 md:h-16 flex items-center justify-between">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          aria-label="Ir para a página inicial"
        >
          <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-pe-gold flex items-center justify-center">
            <Navigation size={16} className="text-pe-navy" />
          </div>
          <span className="text-lg md:text-xl font-black tracking-tight text-white">
            TRIP<span className="text-pe-gold">SMART</span>
          </span>
        </button>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(backTo)}
            className="gap-1.5 text-xs font-bold text-white/80 hover:text-white hover:bg-white/10"
          >
            <ArrowLeft size={14} /> <span className="hidden sm:inline">{backLabel}</span>
          </Button>
        </div>
      </div>
    </nav>
  );
};

export default AppHeader;
