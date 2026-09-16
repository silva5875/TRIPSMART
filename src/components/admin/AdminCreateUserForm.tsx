import { useState } from 'react';
import { Eye, EyeOff, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useCreateUser, type CreateUserInput } from '@/data/admin';
import { PASSWORD_REGEX, PASSWORD_REQUIREMENTS_TEXT, isAtLeast18 } from '@/lib/validation';
import { getErrorMessage } from '@/lib/errors';

interface AdminCreateUserFormProps {
  /** Chamado após criar com sucesso — a tela pai decide o que fazer (ex.: voltar para a lista). */
  onCreated?: () => void;
}

const AdminCreateUserForm = ({ onCreated }: AdminCreateUserFormProps) => {
  const { toast } = useToast();
  const createUser = useCreateUser();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<CreateUserInput['role']>('user');
  const [showPassword, setShowPassword] = useState(false);

  const resetForm = () => {
    setDisplayName('');
    setEmail('');
    setBirthDate('');
    setPassword('');
    setConfirmPassword('');
    setRole('user');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!displayName.trim()) {
      toast({ title: 'Nome obrigatório', variant: 'destructive' });
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      toast({ title: 'Email inválido', variant: 'destructive' });
      return;
    }
    if (!birthDate || !isAtLeast18(birthDate)) {
      toast({ title: 'Idade inválida', description: 'O usuário precisa ter pelo menos 18 anos.', variant: 'destructive' });
      return;
    }
    if (!PASSWORD_REGEX.test(password)) {
      toast({ title: 'Senha fraca', description: PASSWORD_REQUIREMENTS_TEXT, variant: 'destructive' });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: 'Senhas diferentes', description: 'A confirmação precisa ser igual à senha.', variant: 'destructive' });
      return;
    }

    createUser.mutate(
      { displayName: displayName.trim(), email: email.trim(), birthDate, password, role },
      {
        onSuccess: () => {
          toast({ title: 'Usuário criado!', description: `${email} já pode entrar normalmente.` });
          resetForm();
          onCreated?.();
        },
        onError: (error: Error) =>
          toast({ title: 'Erro ao criar usuário', description: getErrorMessage(error, 'Não foi possível criar o usuário. Tente novamente.'), variant: 'destructive' }),
      }
    );
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-lg rounded-2xl border border-border bg-card p-5 md:p-6 space-y-4"
      style={{ boxShadow: 'var(--card-shadow)' }}
    >
      <p className="text-sm text-muted-foreground">
        A conta é criada com login liberado na hora — a pessoa não precisa confirmar email para entrar.
      </p>

      <div className="space-y-2">
        <Label htmlFor="new-user-name">Nome</Label>
        <Input
          id="new-user-name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Nome de exibição"
          required
          className="h-11 rounded-xl"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="new-user-email">Email</Label>
        <Input
          id="new-user-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="pessoa@exemplo.com"
          required
          className="h-11 rounded-xl"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="new-user-birthdate">Data de nascimento</Label>
        <Input
          id="new-user-birthdate"
          type="date"
          value={birthDate}
          onChange={(e) => setBirthDate(e.target.value)}
          max={new Date().toISOString().slice(0, 10)}
          required
          className="h-11 rounded-xl"
        />
        <p className="text-xs text-muted-foreground">Precisa ter pelo menos 18 anos.</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="new-user-password">Senha</Label>
        <div className="relative">
          <Input
            id="new-user-password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mínimo 8 caracteres"
            className="h-11 rounded-xl pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        <p className="text-xs text-muted-foreground">{PASSWORD_REQUIREMENTS_TEXT}</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="new-user-confirm">Confirmar senha</Label>
        <Input
          id="new-user-confirm"
          type={showPassword ? 'text' : 'password'}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Repita a senha"
          className="h-11 rounded-xl"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="new-user-role">Papel</Label>
        <Select value={role} onValueChange={(v) => setRole(v as CreateUserInput['role'])}>
          <SelectTrigger id="new-user-role" className="h-11 rounded-xl">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="user">Cliente</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button
        type="submit"
        disabled={createUser.isPending}
        className="w-full h-11 rounded-xl font-bold gap-2 bg-pe-gold hover:bg-pe-gold/90 text-pe-navy border-0"
      >
        <UserPlus size={16} /> {createUser.isPending ? 'Criando...' : 'Criar usuário'}
      </Button>
    </form>
  );
};

export default AdminCreateUserForm;
