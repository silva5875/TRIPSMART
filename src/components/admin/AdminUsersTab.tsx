import { useState } from 'react';
import { UserPlus, Users } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AdminUsersList from './AdminUsersList';
import AdminCreateUserForm from './AdminCreateUserForm';

const AdminUsersTab = () => {
  const [tab, setTab] = useState('list');

  return (
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList className="mb-4">
        <TabsTrigger value="list" className="gap-1.5">
          <Users size={14} /> Usuários
        </TabsTrigger>
        <TabsTrigger value="create" className="gap-1.5">
          <UserPlus size={14} /> Criar usuário
        </TabsTrigger>
      </TabsList>

      <TabsContent value="list">
        <AdminUsersList />
      </TabsContent>
      <TabsContent value="create">
        {/* Volta para a lista ao criar, para ver a nova conta aparecer na hora. */}
        <AdminCreateUserForm onCreated={() => setTab('list')} />
      </TabsContent>
    </Tabs>
  );
};

export default AdminUsersTab;
