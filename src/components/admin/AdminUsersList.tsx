import { useMemo, useState } from 'react';
import { Ban, Code2, Search, ShieldCheck, ShieldOff, UserCheck } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) => u.displayName?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)
    );
  }, [users, search]);

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
        <div className="space-y-3">
          {filtered.map((u) => {
            const isAdminUser = u.roles.includes('admin');
            const isDev = u.roles.includes('dev');
            const isBanned = u.isBanned;
            const isSelf = u.id === me?.id;

            return (
              <div key={u.id} className="rounded-2xl border border-border bg-card p-4 space-y-3" style={{ boxShadow: 'var(--card-shadow)' }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-pe-gold flex items-center justify-center text-xs font-bold text-pe-navy shrink-0">
                      {initials(u.displayName || u.email)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-foreground truncate">{u.displayName || 'Sem nome'}</p>
                      <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-muted-foreground tabular-nums shrink-0">
                    {u.userNumber != null ? `#${u.userNumber}` : '—'}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 py-3 border-y border-border/60">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Nascimento</p>
                    <p className="text-xs text-foreground">{formatBirthDate(u.birthDate)}</p>
                    <p className="text-[10px] text-muted-foreground">{formatExactAge(u.ageYears, u.ageMonths, u.ageDays)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Cadastro</p>
                    <p className="text-xs text-foreground">{formatDate(u.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Último acesso</p>
                    <p className="text-xs text-foreground">{formatDate(u.lastSignInAt)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Viagens</p>
                    <p className="text-xs font-semibold text-foreground tabular-nums">{u.tripsCount}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Compartilhados</p>
                    <p className="text-xs font-semibold text-foreground tabular-nums">{u.sharedCount}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <Select value={u.planId} onValueChange={(planId) => changePlan(u, planId)} disabled={setPlan.isPending}>
                    <SelectTrigger className="h-8 w-[130px] text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {plans.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex flex-wrap gap-1">
                    {isDev && <Badge className="bg-pe-gold text-pe-navy border-0">Dev</Badge>}
                    {isAdminUser && <Badge className="bg-pe-navy text-white border-0">Admin</Badge>}
                    {isBanned && <Badge variant="destructive">Inativo</Badge>}
                    {!isAdminUser && !isBanned && <Badge variant="outline">Ativo</Badge>}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-border/60">
                  {isAdminUser ? (
                    <Button
                      size="sm" variant="ghost" disabled={isSelf || setRole.isPending}
                      title={isSelf ? 'Você não pode remover seu próprio acesso de admin' : 'Remover admin'}
                      onClick={() => setPending({ kind: 'revoke-admin', user: u })}
                      className="gap-1 text-xs"
                    >
                      <ShieldOff size={13} /> Remover admin
                    </Button>
                  ) : (
                    <Button
                      size="sm" variant="ghost" disabled={setRole.isPending}
                      onClick={() => grantAdmin(u)}
                      className="gap-1 text-xs"
                    >
                      <ShieldCheck size={13} /> Tornar admin
                    </Button>
                  )}

                  {isDev ? (
                    <Button
                      size="sm" variant="ghost" disabled={isSelf || setRole.isPending}
                      title={isSelf ? 'Você não pode remover sua própria tag de dev' : 'Remover dev'}
                      onClick={() => setPending({ kind: 'revoke-dev', user: u })}
                      className="gap-1 text-xs"
                    >
                      <Code2 size={13} /> Remover dev
                    </Button>
                  ) : (
                    <Button
                      size="sm" variant="ghost" disabled={setRole.isPending}
                      onClick={() => grantDev(u)}
                      className="gap-1 text-xs"
                    >
                      <Code2 size={13} /> Tornar dev
                    </Button>
                  )}

                  {isBanned ? (
                    <Button
                      size="sm" variant="ghost" disabled={setBanned.isPending}
                      onClick={() => setPending({ kind: 'unban', user: u })}
                      className="gap-1 text-xs text-primary"
                    >
                      <UserCheck size={13} /> Reativar
                    </Button>
                  ) : (
                    <Button
                      size="sm" variant="ghost" disabled={isSelf || setBanned.isPending}
                      title={isSelf ? 'Você não pode inativar sua própria conta' : 'Inativar usuário'}
                      onClick={() => setPending({ kind: 'ban', user: u })}
                      className="gap-1 text-xs text-destructive hover:text-destructive"
                    >
                      <Ban size={13} /> Inativar
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

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
