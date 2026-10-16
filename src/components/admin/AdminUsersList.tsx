import { useMemo, useState } from 'react';
import { Ban, ChevronRight, Code2, Search, ShieldCheck, ShieldOff, UserCheck } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminUsers, useSetUserBanned, useSetUserPlan, useSetUserRole, type AdminUserDTO } from '@/data/admin';
import { usePlans } from '@/data/plans';
import { formatBirthDate, formatExactAge, initials } from '@/lib/format';
import { getErrorMessage } from '@/lib/errors';

type PendingAction =
  | { kind: 'revoke-admin'; user: AdminUserDTO }
  | { kind: 'revoke-dev'; user: AdminUserDTO }
  | { kind: 'ban'; user: AdminUserDTO }
  | { kind: 'unban'; user: AdminUserDTO };

const formatDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

const DetailRow = ({ label, value, sublabel }: { label: string; value: string; sublabel?: string }) => (
  <div>
    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
    <p className="text-sm font-bold text-foreground">{value}</p>
    {sublabel && <p className="text-xs text-muted-foreground">{sublabel}</p>}
  </div>
);

const AdminUsersList = () => {
  const { user: me } = useAuth();
  const { toast } = useToast();
  const { data: users = [], isLoading } = useAdminUsers();
  const { data: plans = [] } = usePlans();
  const setRole = useSetUserRole();
  const setBanned = useSetUserBanned();
  const setPlan = useSetUserPlan();

  const [search, setSearch] = useState('');
  const [pending, setPending] = useState<PendingAction | null>(null);
  // Guarda só o id — assim o painel de detalhe sempre reflete o dado mais
  // recente de `users` (ex: depois de trocar o plano) em vez de uma cópia
  // que ficaria desatualizada até fechar e abrir de novo.
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // `users` já vem de admin_list_users() ordenado por criação (mais recente
  // primeiro) — a busca só filtra, nunca muda essa ordem.
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) => u.displayName?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)
    );
  }, [users, search]);

  const selectedUser = users.find((u) => u.id === selectedUserId) ?? null;
  const planName = (planId: string) => plans.find((p) => p.id === planId)?.name ?? planId;

  const onError = (error: Error) =>
    toast({ title: 'Erro', description: getErrorMessage(error, 'Não foi possível concluir a ação. Tente novamente.'), variant: 'destructive' });

  const grantAdmin = (u: AdminUserDTO) => {
    setRole.mutate(
      { userId: u.id, role: 'admin', grant: true },
      { onSuccess: () => toast({ title: 'Admin concedido', description: u.displayName ?? u.email ?? '' }), onError }
    );
  };

  const confirmRevoke = (u: AdminUserDTO) => {
    setRole.mutate(
      { userId: u.id, role: 'admin', grant: false },
      { onSuccess: () => toast({ title: 'Admin removido', description: u.displayName ?? u.email ?? '' }), onError }
    );
    setPending(null);
  };

  // 'dev' dá o mesmo acesso de 'admin' em todo o sistema (is_admin() aceita
  // os dois) — por isso concede/remove pelo mesmo RPC e pede a mesma
  // confirmação ao remover.
  const grantDev = (u: AdminUserDTO) => {
    setRole.mutate(
      { userId: u.id, role: 'dev', grant: true },
      { onSuccess: () => toast({ title: 'Dev concedido', description: u.displayName ?? u.email ?? '' }), onError }
    );
  };

  const confirmRevokeDev = (u: AdminUserDTO) => {
    setRole.mutate(
      { userId: u.id, role: 'dev', grant: false },
      { onSuccess: () => toast({ title: 'Dev removido', description: u.displayName ?? u.email ?? '' }), onError }
    );
    setPending(null);
  };

  const confirmBan = (u: AdminUserDTO, banned: boolean) => {
    setBanned.mutate(
      { userId: u.id, banned },
      {
        onSuccess: () =>
          toast({ title: banned ? 'Usuário inativado' : 'Usuário reativado', description: u.displayName ?? u.email ?? '' }),
        onError,
      }
    );
    setPending(null);
  };

  const changePlan = (u: AdminUserDTO, planId: string) => {
    setPlan.mutate(
      { userId: u.id, planId },
      {
        onSuccess: () => toast({ title: 'Plano atualizado', description: u.displayName ?? u.email ?? '' }),
        onError,
      }
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 px-4 py-3 bg-card rounded-2xl border border-border max-w-md" style={{ boxShadow: 'var(--card-shadow)' }}>
        <Search size={18} className="text-muted-foreground shrink-0" />
        <input
          type="text"
          placeholder="Buscar por nome ou email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-transparent outline-none text-sm text-foreground w-full placeholder:text-muted-foreground"
        />
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-center py-12">Carregando usuários...</p>
      ) : filtered.length === 0 ? (
        <p className="text-muted-foreground text-center py-12">Nenhum usuário encontrado.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((u) => (
            <button
              key={u.id}
              onClick={() => setSelectedUserId(u.id)}
              className="w-full p-3 rounded-xl border border-border bg-card hover:border-primary/40 transition-colors text-left"
              style={{ boxShadow: 'var(--card-shadow)' }}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-pe-gold flex items-center justify-center text-xs font-bold text-pe-navy shrink-0">
                  {initials(u.displayName || u.email)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-foreground truncate">{u.displayName || 'Sem nome'}</p>
                  <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                </div>
                <ChevronRight size={18} className="text-muted-foreground shrink-0" />
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground mt-2 pt-2 border-t border-border/60">
                <span>Último acesso: {formatDate(u.lastSignInAt)}</span>
                <span className="font-semibold text-foreground tabular-nums">
                  {u.tripsCount} roteiro{u.tripsCount === 1 ? '' : 's'}
                </span>
                <span className="font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                  {planName(u.planId)}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      <Dialog open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUserId(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          {selectedUser && (() => {
            const isAdminUser = selectedUser.roles.includes('admin');
            const isDev = selectedUser.roles.includes('dev');
            const isBanned = selectedUser.isBanned;
            const isSelf = selectedUser.id === me?.id;

            return (
              <>
                <DialogHeader>
                  <DialogTitle className="text-xl font-black text-foreground flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-pe-gold flex items-center justify-center text-sm font-bold text-pe-navy shrink-0">
                      {initials(selectedUser.displayName || selectedUser.email)}
                    </div>
                    <span className="truncate">{selectedUser.displayName || 'Sem nome'}</span>
                  </DialogTitle>
                  <p className="text-xs text-muted-foreground break-words">
                    {selectedUser.email} · {selectedUser.userNumber != null ? `#${selectedUser.userNumber}` : '—'}
                  </p>
                </DialogHeader>

                <div className="mt-6 space-y-5">
                  <div className="space-y-4">
                    <DetailRow
                      label="Nascimento"
                      value={formatBirthDate(selectedUser.birthDate)}
                      sublabel={formatExactAge(selectedUser.ageYears, selectedUser.ageMonths, selectedUser.ageDays)}
                    />
                    <DetailRow label="Cadastro" value={formatDate(selectedUser.createdAt)} />
                    <DetailRow label="Último acesso" value={formatDate(selectedUser.lastSignInAt)} />
                    <DetailRow label="Viagens" value={`${selectedUser.tripsCount}`} />
                    <DetailRow label="Compartilhados" value={`${selectedUser.sharedCount}`} />
                  </div>

                  <div className="space-y-2 pt-4 border-t border-border">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Plano</p>
                    <Select
                      value={selectedUser.planId}
                      onValueChange={(planId) => changePlan(selectedUser, planId)}
                      disabled={setPlan.isPending}
                    >
                      <SelectTrigger className="h-9 w-[160px] text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {plans.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {isDev && <Badge className="bg-pe-gold text-pe-navy border-0">Dev</Badge>}
                    {isAdminUser && <Badge className="bg-pe-navy text-white border-0">Admin</Badge>}
                    {isBanned && <Badge variant="destructive">Inativo</Badge>}
                    {!isAdminUser && !isBanned && <Badge variant="outline">Ativo</Badge>}
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap pt-4 border-t border-border">
                    {isAdminUser ? (
                      <Button
                        size="sm" variant="ghost" disabled={isSelf || setRole.isPending}
                        title={isSelf ? 'Você não pode remover seu próprio acesso de admin' : 'Remover admin'}
                        onClick={() => setPending({ kind: 'revoke-admin', user: selectedUser })}
                        className="gap-1 text-xs"
                      >
                        <ShieldOff size={13} /> Remover admin
                      </Button>
                    ) : (
                      <Button
                        size="sm" variant="ghost" disabled={setRole.isPending}
                        onClick={() => grantAdmin(selectedUser)}
                        className="gap-1 text-xs"
                      >
                        <ShieldCheck size={13} /> Tornar admin
                      </Button>
                    )}

                    {isDev ? (
                      <Button
                        size="sm" variant="ghost" disabled={isSelf || setRole.isPending}
                        title={isSelf ? 'Você não pode remover sua própria tag de dev' : 'Remover dev'}
                        onClick={() => setPending({ kind: 'revoke-dev', user: selectedUser })}
                        className="gap-1 text-xs"
                      >
                        <Code2 size={13} /> Remover dev
                      </Button>
                    ) : (
                      <Button
                        size="sm" variant="ghost" disabled={setRole.isPending}
                        onClick={() => grantDev(selectedUser)}
                        className="gap-1 text-xs"
                      >
                        <Code2 size={13} /> Tornar dev
                      </Button>
                    )}

                    {isBanned ? (
                      <Button
                        size="sm" variant="ghost" disabled={setBanned.isPending}
                        onClick={() => setPending({ kind: 'unban', user: selectedUser })}
                        className="gap-1 text-xs text-primary"
                      >
                        <UserCheck size={13} /> Reativar
                      </Button>
                    ) : (
                      <Button
                        size="sm" variant="ghost" disabled={isSelf || setBanned.isPending}
                        title={isSelf ? 'Você não pode inativar sua própria conta' : 'Inativar usuário'}
                        onClick={() => setPending({ kind: 'ban', user: selectedUser })}
                        className="gap-1 text-xs text-destructive hover:text-destructive"
                      >
                        <Ban size={13} /> Inativar
                      </Button>
                    )}
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!pending} onOpenChange={(open) => !open && setPending(null)}>
        <AlertDialogContent>
          {pending?.kind === 'revoke-admin' && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>Remover acesso de administrador?</AlertDialogTitle>
                <AlertDialogDescription>
                  {pending.user.displayName || pending.user.email} deixará de ter acesso ao painel
                  administrativo. Isso não afeta a conta do usuário nem os dados dele.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => confirmRevoke(pending.user)}>Remover admin</AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
          {pending?.kind === 'revoke-dev' && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>Remover a tag de dev?</AlertDialogTitle>
                <AlertDialogDescription>
                  {pending.user.displayName || pending.user.email} deixará de ter acesso total ao
                  sistema (mesmo acesso de admin). Isso não afeta a conta do usuário nem os dados dele.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => confirmRevokeDev(pending.user)}>Remover dev</AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
          {pending?.kind === 'ban' && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>Inativar {pending.user.displayName || pending.user.email}?</AlertDialogTitle>
                <AlertDialogDescription>
                  A pessoa não conseguirá mais entrar no app — nem por senha, nem pelo Google — até
                  você reativar a conta aqui. Os dados dela não são apagados.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => confirmBan(pending.user, true)}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Inativar usuário
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
          {pending?.kind === 'unban' && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>Reativar {pending.user.displayName || pending.user.email}?</AlertDialogTitle>
                <AlertDialogDescription>
                  A pessoa volta a conseguir entrar no app normalmente.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => confirmBan(pending.user, false)}>Reativar</AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminUsersList;
