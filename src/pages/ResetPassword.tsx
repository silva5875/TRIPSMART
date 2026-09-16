import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Navigation, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import Seo from '@/components/Seo';
import { PASSWORD_REGEX, PASSWORD_REQUIREMENTS_TEXT } from '@/lib/validation';
import { getErrorMessage } from '@/lib/errors';

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(true);
  const { updatePassword, session } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (session) {
      setReady(true);
      setChecking(false);
    }
  }, [session]);

  // Recovery links can land with tokens in the URL (hash or query). With a
  // HashRouter the Supabase client may not pick them up automatically, so we
  // parse and establish the session manually.
  useEffect(() => {
    let cancelled = false;

    const collectParams = () => {
      const raw = window.location.hash.replace(/^#/, '');
      const parts = raw.split('#').concat(window.location.search.replace(/^\?/, ''));
      const params = new URLSearchParams();
      for (const part of parts) {
        const qIndex = part.indexOf('?');
        const query = qIndex >= 0 ? part.slice(qIndex + 1) : part.includes('=') ? part : '';
        new URLSearchParams(query).forEach((v, k) => params.set(k, v));
      }
      return params;
    };

    const run = async () => {
      const params = collectParams();
      const access_token = params.get('access_token');
      const refresh_token = params.get('refresh_token');
      const code = params.get('code');

      try {
        if (access_token && refresh_token) {
          await supabase.auth.setSession({ access_token, refresh_token });
        } else if (code) {
          await supabase.auth.exchangeCodeForSession(code);
        }
      } catch {
        /* handled below via getSession */
      }

      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      setReady(!!data.session);
      setChecking(false);
    };

    run();
    return () => {
      cancelled = true;
    };
  }, []);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!PASSWORD_REGEX.test(password)) {
      toast({ title: 'Senha fraca', description: PASSWORD_REQUIREMENTS_TEXT, variant: 'destructive' });
      return;
    }
    if (password !== confirm) {
      toast({ title: 'Senhas diferentes', description: 'A confirmação precisa ser igual à nova senha.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    const { error } = await updatePassword(password);
    setLoading(false);
    if (error) {
      toast({ title: 'Erro', description: getErrorMessage(error, 'Não foi possível alterar sua senha. Tente novamente.'), variant: 'destructive' });
      return;
    }
    toast({ title: 'Senha alterada!', description: 'Sua nova senha já está ativa.' });
    navigate('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-background">
      <Seo title="Redefinir senha — TRIPSMART" description="Defina uma nova senha para sua conta TRIPSMART." path="/#/redefinir-senha" />
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="inline-flex w-12 h-12 rounded-2xl bg-pe-blue items-center justify-center mb-3">
            <Navigation size={24} className="text-white" />
          </div>
          <h1 className="text-3xl font-black tracking-display text-foreground">Nova senha</h1>
          <p className="text-muted-foreground mt-2">
            {checking ? 'Validando seu link de recuperação...' : ready ? 'Escolha uma nova senha para sua conta' : 'Link inválido ou expirado. Solicite um novo código na tela de login.'}
          </p>

        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="new-password" className="text-sm font-semibold text-foreground">Nova senha</label>
            <Input id="new-password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required className="h-12 rounded-xl border-border bg-card" />
            <p className="text-xs text-muted-foreground">Mín. 8 caracteres, 1 maiúscula, 1 número, 1 especial</p>
          </div>
          <div className="space-y-2">
            <label htmlFor="confirm-password" className="text-sm font-semibold text-foreground">Confirmar nova senha</label>
            <Input id="confirm-password" type="password" placeholder="••••••••" value={confirm} onChange={(e) => setConfirm(e.target.value)} required className="h-12 rounded-xl border-border bg-card" />
          </div>
          <Button type="submit" disabled={loading || checking || !ready} className="w-full h-12 rounded-xl text-base font-bold bg-pe-blue hover:bg-pe-blue/90 text-white border-0">
            {loading ? 'Salvando...' : 'Alterar senha'}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => navigate('/auth')} className="w-full gap-1.5 text-xs font-bold text-muted-foreground">
            <ArrowLeft size={14} /> Voltar ao login
          </Button>
        </form>
      </motion.div>
    </div>
  );
};

export default ResetPassword;
