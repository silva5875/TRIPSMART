import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  User, Mail, Edit3, Save, LogOut, History,
  Users, MapPin, Shield, Eye, EyeOff, Check, AlertTriangle, Camera, Loader2,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRequireAuth } from '@/hooks/use-require-auth';
import AppHeader from '@/components/AppHeader';
import Seo from '@/components/Seo';
import {
  getAvatarFileError, getProfileImageUrl, useMyBirthDate, useProfile, useProfileStats,
  useUpdateMyBirthDate, useUpdateProfile, useUploadProfileImage,
} from '@/data/profiles';
import { useIsAdmin } from '@/data/admin';
import { formatBirthDate, initials as initialOf } from '@/lib/format';
import { isAtLeast18 } from '@/lib/validation';
import { getErrorMessage } from '@/lib/errors';

const Profile = () => {
  const { user } = useRequireAuth();
  const { signOut, updatePassword } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: profile, isLoading } = useProfile();
  const { data: stats } = useProfileStats();
  const { data: isAdmin } = useIsAdmin();
  const { data: myBirthDate } = useMyBirthDate();
  const updateProfile = useUpdateProfile();
  const updateMyBirthDate = useUpdateMyBirthDate();
  const uploadProfileImage = useUploadProfileImage();
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [editing, setEditing] = useState(false);
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  // Semeia os campos editáveis quando o perfil chega (e ao cancelar a edição).
  useEffect(() => {
    setDisplayName(profile?.display_name ?? '');
  }, [profile]);

  useEffect(() => {
    setBirthDate(myBirthDate ?? '');
  }, [myBirthDate]);

  const handleSaveProfile = async () => {
    // Data de nascimento é opcional aqui — muita conta antiga (ou criada via
    // Google) nunca teve esse dado, e forçar agora bloquearia qualquer edição
    // de nome/avatar de quem só quer trocar a foto. Só validamos se algo foi
    // digitado.
    if (birthDate && !isAtLeast18(birthDate)) {
      toast({ title: 'Data inválida', description: 'É preciso ter pelo menos 18 anos.', variant: 'destructive' });
      return;
    }

    try {
      await updateProfile.mutateAsync({ displayName });
      if (birthDate && birthDate !== myBirthDate) {
        await updateMyBirthDate.mutateAsync(birthDate);
      }
      setEditing(false);
      toast({ title: 'Perfil atualizado!' });
    } catch (error) {
      toast({ title: 'Erro ao salvar', description: getErrorMessage(error, 'Não foi possível salvar seu perfil. Tente novamente.'), variant: 'destructive' });
    }
  };

  const cancelEditing = () => {
    setEditing(false);
    setDisplayName(profile?.display_name ?? '');
    setBirthDate(myBirthDate ?? '');
  };

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const validationError = getAvatarFileError(file);
    if (validationError) {
      toast({ title: 'Arquivo inválido', description: validationError, variant: 'destructive' });
      return;
    }

    uploadProfileImage.mutate(file, {
      onSuccess: () => toast({ title: 'Foto de perfil atualizada!' }),
      onError: (error) =>
        toast({ title: 'Erro', description: getErrorMessage(error, 'Não foi possível enviar a imagem. Tente novamente.'), variant: 'destructive' }),
    });
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 8) { toast({ title: 'Senha muito curta', description: 'Mínimo 8 caracteres.', variant: 'destructive' }); return; }
    if (newPassword !== confirmPassword) { toast({ title: 'Senhas não coincidem', variant: 'destructive' }); return; }
    setChangingPassword(true);
    const { error } = await updatePassword(newPassword);
    setChangingPassword(false);
    if (error) { toast({ title: 'Erro', description: getErrorMessage(error, 'Não foi possível alterar sua senha. Tente novamente.'), variant: 'destructive' }); }
    else { setNewPassword(''); setConfirmPassword(''); setShowPasswordSection(false); toast({ title: 'Senha alterada com sucesso!' }); }
  };

  if (isLoading) return null;
  const initials = initialOf(displayName || user?.email);
  const saving = updateProfile.isPending || updateMyBirthDate.isPending;
  const profileImageUrl = getProfileImageUrl(profile?.imagem_perfil ?? null) ?? profile?.avatar_url ?? null;

  return (
    <div className="min-h-screen bg-background">
      <Seo title="Meu perfil — TRIPSMART" description="Gerencie sua conta e veja suas estatísticas de viagens em Pernambuco." path="/perfil" />
      <AppHeader />

      {/* Profile header banner */}
      <div className="bg-pe-blue h-32 relative">
        <div className="absolute bottom-0 left-0 w-1/3 h-full bg-pe-red/10 rounded-tr-[60px]" />
        <div className="absolute top-0 right-0 w-1/4 h-full bg-pe-gold/10 rounded-bl-[40px]" />
      </div>

      <div className="max-w-2xl mx-auto px-6 -mt-16 pb-10 space-y-8">
        {/* Avatar */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 flex flex-col items-center text-center">
          <div className="relative">
            <div className="w-28 h-28 rounded-full bg-pe-gold flex items-center justify-center text-3xl font-black text-pe-navy border-4 border-background shadow-lg overflow-hidden">
              {uploadProfileImage.isPending ? (
                <Loader2 size={28} className="animate-spin text-pe-navy" />
              ) : profileImageUrl ? (
                <img src={profileImageUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                initials
              )}
            </div>
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              disabled={uploadProfileImage.isPending}
              title="Trocar foto de perfil"
              className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full bg-pe-blue text-white border-2 border-background flex items-center justify-center shadow-md hover:bg-pe-blue/90"
            >
              <Camera size={15} />
            </button>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarFileChange}
            />
          </div>
          <h1 className="text-2xl font-black text-foreground mt-4">{displayName || 'Viajante'}</h1>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
        </motion.div>

        {/* Stats */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-3 gap-4">
          {[
            { icon: History, label: 'Viagens', value: stats?.trips ?? 0, color: 'bg-pe-blue' },
            { icon: Users, label: 'Compartilhados', value: stats?.shared ?? 0, color: 'bg-pe-red' },
            { icon: MapPin, label: 'Curtidas', value: stats?.likes ?? 0, color: 'bg-pe-gold' },
          ].map((stat) => (
            <div key={stat.label} className="p-4 rounded-2xl border border-border bg-card text-center" style={{ boxShadow: 'var(--card-shadow)' }}>
              <div className={`w-10 h-10 rounded-xl ${stat.color} flex items-center justify-center mx-auto mb-2`}>
                <stat.icon size={18} className={stat.color === 'bg-pe-gold' ? 'text-pe-navy' : 'text-white'} />
              </div>
              <p className="text-2xl font-black text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground font-semibold">{stat.label}</p>
            </div>
          ))}
        </motion.div>

        {/* Edit profile */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="p-6 rounded-2xl border border-border bg-card space-y-5" style={{ boxShadow: 'var(--card-shadow)' }}>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-pe-blue flex items-center justify-center"><User size={16} className="text-white" /></div>
              Informações pessoais
            </h2>
            {!editing && (
              <Button variant="ghost" size="sm" onClick={() => setEditing(true)} className="gap-1.5 text-xs font-bold">
                <Edit3 size={14} /> Editar
              </Button>
            )}
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nome de exibição</Label>
              {editing ? <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Seu nome" className="h-11 rounded-xl" /> : <p className="text-sm font-semibold text-foreground py-2">{displayName || 'Não definido'}</p>}
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Data de nascimento</Label>
              {editing ? (
                <Input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  max={new Date().toISOString().slice(0, 10)}
                  className="h-11 rounded-xl"
                />
              ) : (
                <p className="text-sm font-semibold text-foreground py-2">{formatBirthDate(myBirthDate)}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email</Label>
              <div className="flex items-center gap-2 py-2"><Mail size={14} className="text-muted-foreground" /><p className="text-sm text-foreground">{user?.email}</p><Check size={14} className="text-primary" /></div>
            </div>
            {editing && (
              <div className="flex gap-3 pt-2">
                <Button onClick={handleSaveProfile} disabled={saving} className="bg-pe-blue hover:bg-pe-blue/90 text-white border-0 rounded-full font-bold gap-2">
                  <Save size={14} /> {saving ? 'Salvando...' : 'Salvar'}
                </Button>
                <Button variant="outline" onClick={cancelEditing} className="rounded-full font-bold">Cancelar</Button>
              </div>
            )}
          </div>
        </motion.div>

        {/* Security */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="p-6 rounded-2xl border border-border bg-card space-y-5" style={{ boxShadow: 'var(--card-shadow)' }}>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-pe-red flex items-center justify-center"><Shield size={16} className="text-white" /></div>
            Segurança
          </h2>
          {!showPasswordSection ? (
            <Button variant="outline" onClick={() => setShowPasswordSection(true)} className="rounded-full font-bold gap-2 border-pe-red/30 text-pe-red hover:bg-pe-red/10">
              🔒 Alterar senha
            </Button>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nova senha</Label>
                <div className="relative">
                  <Input type={showPassword ? 'text' : 'password'} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Mínimo 8 caracteres" className="h-11 rounded-xl pr-10" />
                  <button onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Confirmar senha</Label>
                <Input type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repita a nova senha" className="h-11 rounded-xl" />
                {confirmPassword && newPassword !== confirmPassword && <p className="text-xs text-destructive flex items-center gap-1"><AlertTriangle size={12} /> Senhas não coincidem</p>}
              </div>
              <div className="flex gap-3">
                <Button onClick={handleChangePassword} disabled={changingPassword} className="bg-pe-red hover:bg-pe-red/90 text-white border-0 rounded-full font-bold gap-2">{changingPassword ? 'Alterando...' : 'Alterar senha'}</Button>
                <Button variant="outline" onClick={() => { setShowPasswordSection(false); setNewPassword(''); setConfirmPassword(''); }} className="rounded-full font-bold">Cancelar</Button>
              </div>
            </div>
          )}
        </motion.div>

        {/* Quick links */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="grid grid-cols-2 gap-4">
          <Button variant="outline" onClick={() => navigate('/historico')} className="h-14 rounded-2xl font-bold gap-2 border-pe-blue/30 hover:bg-pe-blue/10 hover:text-primary"><History size={18} /> Histórico</Button>
          <Button variant="outline" onClick={() => navigate('/comunidade')} className="h-14 rounded-2xl font-bold gap-2 border-pe-gold/30 hover:bg-pe-gold/10 hover:text-pe-gold"><Users size={18} /> Comunidade</Button>
          {isAdmin && (
            <Button variant="outline" onClick={() => navigate('/admin')} className="h-14 rounded-2xl font-bold gap-2 border-pe-red/30 hover:bg-pe-red/10 hover:text-pe-red col-span-2">
              <Shield size={18} /> Painel administrativo
            </Button>
          )}
        </motion.div>

        {/* Logout */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="pt-4 border-t border-border">
          <Button variant="ghost" onClick={async () => { await signOut(); navigate('/'); }} className="w-full h-12 rounded-xl text-destructive hover:bg-destructive/10 font-bold gap-2"><LogOut size={18} /> Sair da conta</Button>
        </motion.div>
        <p className="text-xs text-muted-foreground text-center pb-6">
          Membro desde {user?.created_at ? new Date(user.created_at).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }) : '—'}
        </p>
      </div>
    </div>
  );
};

export default Profile;
