import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';
import { Navigation, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Seo from '@/components/Seo';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgot, setIsForgot] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signUp, signInWithGoogle, resetPassword } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleGoogle = async () => {
    setLoading(true);
    const { error } = await signInWithGoogle();
    setLoading(false);
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      navigate('/');
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await resetPassword(email);
    setLoading(false);
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Email enviado!', description: 'Confira sua caixa de entrada para redefinir a senha.' });
      setIsForgot(false);
    }
  };


  const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;

  const validateAge = (dateStr: string): boolean => {
    const birth = new Date(dateStr);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age >= 18;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLogin) {
      if (!passwordRegex.test(password)) {
        toast({ title: 'Senha fraca', description: 'A senha deve ter no mínimo 8 caracteres, 1 letra maiúscula, 1 número e 1 caractere especial.', variant: 'destructive' });
        return;
      }
      if (!birthDate || !validateAge(birthDate)) {
        toast({ title: 'Idade inválida', description: 'Você precisa ter pelo menos 18 anos para se cadastrar.', variant: 'destructive' });
        return;
      }
    }
    setLoading(true);
    const { error } = isLogin
      ? await signIn(email, password)
      : await signUp(email, password, fullName, birthDate);
    setLoading(false);
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else if (!isLogin) {
      toast({ title: 'Conta criada!', description: 'Verifique seu email para confirmar.' });
    } else {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen flex">
      <Seo
        title={isLogin ? 'Entrar — TRIPSMART' : 'Criar conta — TRIPSMART'}
        description={isLogin ? 'Acesse sua conta TRIPSMART para planejar roteiros em Pernambuco.' : 'Crie sua conta TRIPSMART e comece a planejar viagens por Pernambuco com IA.'}
        path="/#/auth"
      />
      {/* Left side — Blue panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-pe-blue relative flex-col justify-between p-12">
        <button onClick={() => navigate('/')} className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
          <div className="w-10 h-10 rounded-xl bg-pe-gold flex items-center justify-center">
            <Navigation size={20} className="text-pe-navy" />
          </div>
          <span className="text-xl font-black tracking-tight text-white">
            TRIP<span className="text-pe-gold">SMART</span>
          </span>
        </button>

        <div className="space-y-6">
          <h2 className="text-4xl font-black text-white tracking-display leading-tight">
            Explore<br />Pernambuco<br />com <span className="text-pe-gold">inteligência</span>
          </h2>
          <p className="text-white/60 max-w-sm">Roteiros personalizados com IA para cidades pernambucanas.</p>
          <div className="flex gap-3">
            {["🏖️", "🐢", "🎭", "🌊"].map((e, i) => (
              <div key={i} className="w-14 h-14 rounded-xl bg-white/10 flex items-center justify-center text-2xl">{e}</div>
            ))}
          </div>
        </div>

        <p className="text-white/30 text-xs">© {new Date().getFullYear()} TripSmart</p>

        {/* Decorative shapes */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-pe-red/20 rounded-bl-[60px]" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-pe-gold/15 rounded-tr-[40px]" />
      </div>

      {/* Right side — Form */}
      <div className="flex-1 flex items-center justify-center px-6 bg-background">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-md"
        >
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <button onClick={() => navigate('/')} className="inline-flex items-center gap-2 mb-2">
              <div className="w-12 h-12 rounded-2xl bg-pe-blue flex items-center justify-center">
                <Navigation size={24} className="text-white" />
              </div>
            </button>
            <div className="text-2xl font-black tracking-tight text-foreground" aria-label="TripSmart">
              <span className="text-primary">TRIP</span><span className="text-pe-gold">SMART</span>
            </div>
          </div>

          <div className="mb-8">
            <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="gap-1.5 text-xs font-bold text-muted-foreground mb-4 lg:mb-6">
              <ArrowLeft size={14} /> Voltar ao início
            </Button>
            <h1 className="text-3xl font-black tracking-display text-foreground">
              {isForgot ? 'Esqueci minha senha' : isLogin ? 'Bem-vindo de volta' : 'Criar conta'}
            </h1>
            <p className="text-muted-foreground mt-2">
              {isForgot ? 'Enviaremos um link de recuperação para o seu email' : isLogin ? 'Entre para planejar sua viagem' : 'Cadastre-se para começar a explorar'}
            </p>
          </div>

          {isForgot ? (
            <form onSubmit={handleForgot} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="forgot-email" className="text-sm font-semibold text-foreground">Email</label>
                <Input id="forgot-email" type="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-12 rounded-xl border-border bg-card" />
              </div>
              <Button type="submit" disabled={loading} className="w-full h-12 rounded-xl text-base font-bold bg-pe-blue hover:bg-pe-blue/90 text-white border-0">
                {loading ? 'Enviando...' : 'Enviar link de recuperação'}
              </Button>
              <button type="button" onClick={() => setIsForgot(false)} className="w-full text-center text-sm font-bold text-primary hover:underline pt-2">
                Voltar ao login
              </button>
            </form>
          ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <>
                <div className="space-y-2">
                  <label htmlFor="auth-fullname" className="text-sm font-semibold text-foreground">Nome completo</label>
                  <Input id="auth-fullname" type="text" placeholder="Seu nome" value={fullName} onChange={(e) => setFullName(e.target.value)} required maxLength={100} className="h-12 rounded-xl border-border bg-card" />
                </div>
                <div className="space-y-2">
                  <label htmlFor="auth-birthdate" className="text-sm font-semibold text-foreground">Data de nascimento</label>
                  <Input id="auth-birthdate" type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} required className="h-12 rounded-xl border-border bg-card" />
                </div>
              </>
            )}
            <div className="space-y-2">
              <label htmlFor="auth-email" className="text-sm font-semibold text-foreground">Email</label>
              <Input id="auth-email" type="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-12 rounded-xl border-border bg-card" />
            </div>
            <div className="space-y-2">
              <label htmlFor="auth-password" className="text-sm font-semibold text-foreground">Senha</label>
              <Input id="auth-password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="h-12 rounded-xl border-border bg-card" />
              {!isLogin && (
                <p className="text-xs text-muted-foreground">Mín. 8 caracteres, 1 maiúscula, 1 número, 1 especial</p>
              )}
            </div>
            {isLogin && (
              <button type="button" onClick={() => setIsForgot(true)} className="text-sm font-bold text-primary hover:underline">
                Esqueci minha senha
              </button>
            )}
            <Button type="submit" disabled={loading} className="w-full h-12 rounded-xl text-base font-bold bg-pe-blue hover:bg-pe-blue/90 text-white border-0">
              {loading ? 'Carregando...' : isLogin ? 'Entrar' : 'Criar conta'}
            </Button>

            <div className="flex items-center gap-3 py-1">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs font-bold text-muted-foreground">ou</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <Button type="button" variant="outline" disabled={loading} onClick={handleGoogle} className="w-full h-12 rounded-xl text-base font-bold gap-2 bg-card">
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.57c2.08-1.92 3.27-4.74 3.27-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.76c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.05l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
              </svg>
              Entrar com o Google
            </Button>

            <p className="text-center text-sm text-muted-foreground pt-2">
              {isLogin ? 'Não tem conta?' : 'Já tem conta?'}{' '}
              <button type="button" onClick={() => setIsLogin(!isLogin)} className="font-bold text-primary hover:underline">
                {isLogin ? 'Cadastre-se' : 'Faça login'}
              </button>
            </p>
          </form>
          )}

        </motion.div>
      </div>
    </div>
  );
};

export default Auth;
