import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

export interface DrillDownRow {
  id: string;
  title: string;
  subtitle?: string;
  meta?: string;
}

interface AdminDrillDownSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  loading: boolean;
  empty: string;
  rows: DrillDownRow[];
}

/**
 * Painel lateral reaproveitado por todos os cartões de "Atividade gerada no
 * site" — cada um só muda o que busca, não como mostra a lista.
 */
const AdminDrillDownSheet = ({
  open, onOpenChange, title, description, loading, empty, rows,
}: AdminDrillDownSheetProps) => (
  <Sheet open={open} onOpenChange={onOpenChange}>
    <SheetContent className="w-full sm:max-w-lg overflow-y-auto bg-background border-l border-border">
      <SheetHeader>
        <SheetTitle className="text-xl font-black text-foreground">{title}</SheetTitle>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </SheetHeader>
      <div className="mt-6 space-y-2">
        {loading ? (
          <p className="text-sm text-muted-foreground text-center py-12">Carregando...</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12">{empty}</p>
        ) : (
          rows.map((r) => (
            <div key={r.id} className="p-3 rounded-xl border border-border bg-card">
              <p className="text-sm font-bold text-foreground break-words">{r.title}</p>
              {r.subtitle && <p className="text-xs text-muted-foreground break-words">{r.subtitle}</p>}
              {r.meta && <p className="text-[11px] text-muted-foreground mt-1">{r.meta}</p>}
            </div>
          ))
        )}
      </div>
    </SheetContent>
  </Sheet>
);

export default AdminDrillDownSheet;
