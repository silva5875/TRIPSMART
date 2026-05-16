import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Navigation, ArrowLeft, User, Mail, Edit3, Save, LogOut, History,
  Users, MapPin, Shield, Eye, EyeOff, Check, AlertTriangle,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import ThemeToggle from '@/components/ThemeToggle';
import Seo from '@/components/Seo';

const Profile = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [stats, setStats] = useState({ trips: 0, shared: 0, likes: 0 });

  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
    fetchProfile();
    fetchStats();
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    if (data) { setDisplayName(data.display_name || ''); setAvatarUrl(data.avatar_url || ''); }
    setLoading(false);
  };

  const fetchStats = async () => {
    if (!user) return;
    const [{ count: trips }, { count: shared }, { count: likesCount }] = await Promise.all([
      supabase.from('travel_history').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('shared_itineraries').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('itinerary_likes').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
    ]);
    setStats({ trips: trips || 0, shared: shared || 0, likes: likesCount || 0 });
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from('profiles').upsert({ id: user.id, display_name: displayName.trim() || null, avatar_url: avatarUrl.trim() || null });
    setSaving(false);
    if (error) { toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' }); }
    else { setEditing(false); toast({ title: 'Perfil atualizado! ✅' }); }
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 8) { toast({ title: 'Senha muito curta', description: 'Mínimo 8 caracteres.', variant: 'destructive' }); return; }
    if (newPassword !== confirmPassword) { toast({ title: 'Senhas não coincidem', variant: 'destructive' }); return; }
    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setChangingPassword(false);
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); }
    else { setNewPassword(''); setConfirmPassword(''); setShowPasswordSection(false); toast({ title: 'Senha alterada com sucesso! 🔒' }); }
  };

  if (loading) return null;
  const initials = (displayName || user?.email || 'U')[0].toUpperCase();

  return (
    <div className="min-h-screen bg-background">
      <Seo title="Meu perfil — TRIPSMART" description="Gerencie sua conta e veja suas estatísticas de viagens em Pernambuco." path="/#/perfil" />
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-pe-navy border-b border-pe-blue/20">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <button onClick={() => navigate('/')} className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
            <div className="w-10 h-10 rounded-xl bg-pe-gold flex items-center justify-center">
              <Navigation size={20} className="text-pe-navy" />
            </div>
            <span className="text-xl font-black tracking-tight text-white">
              TRIP<span className="text-pe-gold">SMART</span>
            </span>
          </button>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="gap-1.5 text-xs font-bold text-white/80 hover:text-white hover:bg-white/10">
              <ArrowLeft size={14} /> Início
            </Button>
          </div>
        </div>
      </nav>

      {/* Profile header banner */}
      <div className="bg-pe-blue h-32 relative">
        <div className="absolute bottom-0 left-0 w-1/3 h-full bg-pe-red/10 rounded-tr-[60px]" />
        <div className="absolute top-0 right-0 w-1/4 h-full bg-pe-gold/10 rounded-bl-[40px]" />
      </div>

      <div className="max-w-2xl mx-auto px-6 -mt-16 pb-10 space-y-8">
        {/* Avatar */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center text-center">
          <div className="w-28 h-28 rounded-full bg-pe-gold flex items-center justify-center text-3xl font-black text-pe-navy border-4 border-background shadow-lg">
            {avatarUrl ? <img src={avatarUrl} alt="Avatar" className="w-full h-full rounded-full object-cover" /> : initials}
          </div>
          <h1 className="text-2xl font-black text-foreground mt-4">{displayName || 'Viajante'}</h1>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
        </motion.div>

        {/* Stats */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-3 gap-4">
          {[
            { icon: History, label: 'Viagens', value: stats.trips, color: 'bg-pe-blue' },
            { icon: Users, label: 'Compartilhados', value: stats.shared, color: 'bg-pe-red' },
            { icon: MapPin, label: 'Curtidas', value: stats.likes, color: 'bg-pe-gold' },
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
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">URL do avatar</Label>
              {editing ? <Input value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://exemplo.com/foto.jpg" className="h-11 rounded-xl" /> : <p className="text-sm font-semibold text-foreground py-2">{avatarUrl || 'Não definido'}</p>}
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
                <Button variant="outline" onClick={() => { setEditing(false); fetchProfile(); }} className="rounded-full font-bold">Cancelar</Button>
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
