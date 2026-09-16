import { Archive, LayoutDashboard, ShieldAlert, Users } from 'lucide-react';
import AppHeader from '@/components/AppHeader';
import Seo from '@/components/Seo';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { useIsAdmin } from '@/data/admin';
import AdminOverviewTab from '@/components/admin/AdminOverviewTab';
import AdminUsersTab from '@/components/admin/AdminUsersTab';
import AdminDeletedTab from '@/components/admin/AdminDeletedTab';

const Admin = () => {
  const { loading: authLoading } = useRequireAuth();
  const { data: isAdmin, isLoading: verificandoPapel } = useIsAdmin();

  if (authLoading || verificandoPapel) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <p className="text-center text-muted-foreground py-20">Verificando permissões...</p>
      </div>
    );
  }

  // Esta checagem é conveniência de interface, não segurança: quem proíbe o
  // acesso aos dados é o RLS e as checagens `is_admin()` dentro de cada função
  // do banco.
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Seo title="Acesso restrito — TRIPSMART" description="Área administrativa." path="/#/admin" />
        <AppHeader />
        <div className="max-w-md mx-auto px-6 py-20 text-center space-y-4">
          <ShieldAlert size={48} className="mx-auto text-muted-foreground" />
          <h1 className="text-2xl font-black text-foreground">Acesso restrito</h1>
          <p className="text-muted-foreground">
            Esta área é exclusiva de administradores. Se você deveria ter acesso, peça a um
            administrador para conceder o papel à sua conta.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Seo title="Painel administrativo — TRIPSMART" description="Visão geral, usuários e registros removidos." path="/#/admin" />
      <AppHeader />

      <div className="bg-pe-navy px-4 md:px-6 py-8 md:py-10">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl md:text-3xl font-black tracking-display text-white">
            Painel administrativo
          </h1>
          <p className="text-white/70 mt-2 text-sm md:text-base">
            Acompanhamento do site, gestão de usuários e conteúdo removido.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-10">
        <Tabs defaultValue="overview">
          <TabsList className="mb-6">
            <TabsTrigger value="overview" className="gap-1.5">
              <LayoutDashboard size={14} /> Visão geral
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-1.5">
              <Users size={14} /> Usuários
            </TabsTrigger>
            <TabsTrigger value="deleted" className="gap-1.5">
              <Archive size={14} /> Removidos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <AdminOverviewTab />
          </TabsContent>
          <TabsContent value="users">
            <AdminUsersTab />
          </TabsContent>
          <TabsContent value="deleted">
            <AdminDeletedTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;
