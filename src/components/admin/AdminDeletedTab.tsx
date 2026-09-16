import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Archive, RotateCcw, Trash2, UserX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  ENTITY_LABELS, useDeletedRecords, useRestoreRecord,
  type DeletedRecord, type SoftDeletableEntity,
} from '@/data/admin';
import { getErrorMessage } from '@/lib/errors';

type Filtro = 'todos' | SoftDeletableEntity;

const AdminDeletedTab = () => {
  const { toast } = useToast();
  const { data: registros = [], isLoading } = useDeletedRecords();
  const restaurar = useRestoreRecord();

  const [filtro, setFiltro] = useState<Filtro>('todos');

  const visiveis = useMemo(
    () => (filtro === 'todos' ? registros : registros.filter((r) => r.entity === filtro)),
    [registros, filtro]
  );

  const contagem = useMemo(() => {
    const c: Record<string, number> = { todos: registros.length };
    for (const r of registros) c[r.entity] = (c[r.entity] ?? 0) + 1;
    return c;
  }, [registros]);

  const handleRestore = (registro: DeletedRecord) => {
    restaurar.mutate(
      { entity: registro.entity, id: registro.id },
      {
        onSuccess: () => toast({ title: 'Registro restaurado', description: registro.title }),
        onError: (error: Error) =>
          toast({ title: 'Erro ao restaurar', description: getErrorMessage(error, 'Não foi possível restaurar o registro. Tente novamente.'), variant: 'destructive' }),
      }
    );
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground flex items-center gap-2">
        <Archive size={16} /> Itens apagados pelos usuários ou pela moderação. Nada é excluído de fato do banco.
      </p>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por tipo">
        {(['todos', 'travel_history', 'shared_itineraries', 'itinerary_comments'] as Filtro[]).map((f) => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            className={`text-xs font-bold px-3 py-1.5 rounded-full transition-all border ${
              filtro === f
                ? 'bg-pe-navy text-white border-pe-navy'
                : 'bg-card border-border text-muted-foreground hover:border-pe-navy/40'
            }`}
          >
            {f === 'todos' ? 'Todos' : ENTITY_LABELS[f]} ({contagem[f] ?? 0})
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-center py-12">Carregando...</p>
      ) : visiveis.length === 0 ? (
        <div className="text-center py-20">
          <Trash2 size={48} className="mx-auto text-muted-foreground mb-4" />
          <p className="text-lg text-muted-foreground">
            {registros.length === 0
              ? 'Nenhum registro removido até agora.'
              : 'Nenhum registro removido deste tipo.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {visiveis.map((registro, i) => (
            <motion.div
              key={`${registro.entity}-${registro.id}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.03, 0.3) }}
              className="rounded-2xl border border-border bg-card p-4 md:p-5"
              style={{ boxShadow: 'var(--card-shadow)' }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-pe-blue/10 text-primary">
                      {ENTITY_LABELS[registro.entity]}
                    </span>
                    {registro.removedByModeration && (
                      <span className="flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-pe-red/10 text-pe-red">
                        <UserX size={11} /> Removido pela moderação
                      </span>
                    )}
                  </div>

                  <p className="font-bold text-foreground break-words">{registro.title}</p>
                  <p className="text-sm text-muted-foreground">{registro.detail}</p>

                  <p className="text-xs text-muted-foreground">
                    Criado em {new Date(registro.createdAt).toLocaleDateString('pt-BR')} ·
                    {' '}Removido em{' '}
                    {new Date(registro.deletedAt).toLocaleString('pt-BR', {
                      day: '2-digit', month: '2-digit', year: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  disabled={restaurar.isPending}
                  onClick={() => handleRestore(registro)}
                  className="rounded-full font-bold gap-1.5 shrink-0"
                >
                  <RotateCcw size={14} /> Restaurar
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminDeletedTab;
