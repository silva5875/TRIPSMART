import { useMemo, useState } from 'react';
import { Ban, Search, ShieldCheck, ShieldOff, UserCheck } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminUsers, useSetUserBanned, useSetUserRole, type AdminUserDTO } from '@/data/admin';
import { formatBirthDate, formatExactAge, initials } from '@/lib/format';
import { getErrorMessage } from '@/lib/errors';

type PendingAction =
  | { kind: 'revoke-admin'; user: AdminUserDTO }
  | { kind: 'ban'; user: AdminUserDTO }
  | { kind: 'unban'; user: AdminUserDTO };

const formatDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

const AdminUsersList = () => {
  const { user: me } = useAuth();
  const { toast } = useToast();
  const { data: users = [], isLoading } = useAdminUsers();
  const setRole = useSetUserRole();
  const setBanned = useSetUserBanned();

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
        <div className="rounded-2xl border border-border bg-card overflow-x-auto" style={{ boxShadow: 'var(--card-shadow)' }}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>Nascimento</TableHead>
                <TableHead>Cadastro</TableHead>
                <TableHead>Último acesso</TableHead>
                <TableHead>Viagens</TableHead>
                <TableHead>Compartilhados</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((u) => {
                const isAdminUser = u.roles.includes('admin');
                const isDev = u.roles.includes('dev');
                const isBanned = u.isBanned;
                const isSelf = u.id === me?.id;

                return (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="flex items-center gap-2.5 min-w-[180px]">
                        <div className="w-8 h-8 rounded-full bg-pe-gold flex items-center justify-center text-xs font-bold text-pe-navy shrink-0">
                          {initials(u.displayName || u.email)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-foreground truncate">
                            {u.displayName || 'Sem nome'}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <p className="text-sm text-foreground">{formatBirthDate(u.birthDate)}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatExactAge(u.ageYears, u.ageMonths, u.ageDays)}
                      </p>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {formatDate(u.createdAt)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {formatDate(u.lastSignInAt)}
                    </TableCell>
                    <TableCell className="text-sm font-semibold text-foreground tabular-nums">
                      {u.tripsCount}
                    </TableCell>
                    <TableCell className="text-sm font-semibold text-foreground tabular-nums">
                      {u.sharedCount}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {isDev && (
                          <Badge className="bg-pe-gold text-pe-navy border-0">Dev responsável</Badge>
                        )}
                        {isAdminUser && <Badge className="bg-pe-navy text-white border-0">Admin</Badge>}
                        {isBanned && <Badge variant="destructive">Inativo</Badge>}
                        {!isAdminUser && !isBanned && <Badge variant="outline">Ativo</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
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
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
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
