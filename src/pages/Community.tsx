import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Heart, MessageCircle, Bookmark, Star, MapPin, Users, Calendar, Send, Navigation } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { monthNames } from '@/data/mockData';
import ThemeToggle from '@/components/ThemeToggle';
import Seo from '@/components/Seo';

const Community = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [itineraries, setItineraries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [likes, setLikes] = useState<Record<string, boolean>>({});
  const [saves, setSaves] = useState<Record<string, boolean>>({});
  const [comments, setComments] = useState<Record<string, any[]>>({});
  const [commentText, setCommentText] = useState<Record<string, string>>({});
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [ratings, setRatings] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
    fetchAll();
  }, [user]);

  const fetchAll = async () => {
    setLoading(true);
    const { data: itin } = await supabase.from('shared_itineraries').select('*').order('created_at', { ascending: false });
    const itinList = (itin || []) as any[];
    const userIds = [...new Set(itinList.map(i => i.user_id))];
    const profilesMap: Record<string, any> = {};
    if (userIds.length > 0) {
      const { data: profiles } = await supabase.from('profiles').select('id, display_name, avatar_url').in('id', userIds);
      (profiles || []).forEach((p: any) => { profilesMap[p.id] = p; });
    }
    setItineraries(itinList.map(it => ({ ...it, profile: profilesMap[it.user_id] || null })));
    if (user) {
      const { data: userLikes } = await supabase.from('itinerary_likes').select('itinerary_id').eq('user_id', user.id);
      const likesMap: Record<string, boolean> = {};
      (userLikes || []).forEach((l: any) => { likesMap[l.itinerary_id] = true; });
      setLikes(likesMap);
      const { data: userSaves } = await supabase.from('saved_itineraries').select('itinerary_id').eq('user_id', user.id);
      const savesMap: Record<string, boolean> = {};
      (userSaves || []).forEach((s: any) => { savesMap[s.itinerary_id] = true; });
      setSaves(savesMap);
      const { data: userRatings } = await supabase.from('itinerary_ratings').select('itinerary_id, score').eq('user_id', user.id);
      const ratingsMap: Record<string, number> = {};
      (userRatings || []).forEach((r: any) => { ratingsMap[r.itinerary_id] = r.score; });
      setRatings(ratingsMap);
    }
    setLoading(false);
  };

  const toggleLike = async (id: string) => {
    if (!user) return;
    if (likes[id]) {
      await supabase.from('itinerary_likes').delete().eq('user_id', user.id).eq('itinerary_id', id);
      setLikes(prev => ({ ...prev, [id]: false }));
      setItineraries(prev => prev.map(it => it.id === id ? { ...it, likes_count: Math.max(0, (it.likes_count || 0) - 1) } : it));
    } else {
      await supabase.from('itinerary_likes').insert({ user_id: user.id, itinerary_id: id });
      setLikes(prev => ({ ...prev, [id]: true }));
      setItineraries(prev => prev.map(it => it.id === id ? { ...it, likes_count: (it.likes_count || 0) + 1 } : it));
    }
  };

  const toggleSave = async (id: string) => {
    if (!user) return;
    if (saves[id]) {
      await supabase.from('saved_itineraries').delete().eq('user_id', user.id).eq('itinerary_id', id);
      setSaves(prev => ({ ...prev, [id]: false }));
      toast({ title: 'Roteiro removido dos salvos' });
    } else {
      await supabase.from('saved_itineraries').insert({ user_id: user.id, itinerary_id: id });
      setSaves(prev => ({ ...prev, [id]: true }));
      toast({ title: 'Roteiro salvo! 📌' });
    }
  };

  const rateItinerary = async (id: string, score: number) => {
    if (!user) return;
    if (ratings[id]) {
      await supabase.from('itinerary_ratings').update({ score }).eq('user_id', user.id).eq('itinerary_id', id);
    } else {
      await supabase.from('itinerary_ratings').insert({ user_id: user.id, itinerary_id: id, score });
    }
    setRatings(prev => ({ ...prev, [id]: score }));
    toast({ title: `Avaliação: ${'⭐'.repeat(score)}` });
  };

  const loadComments = async (id: string) => {
    const { data } = await supabase.from('itinerary_comments').select('*').eq('itinerary_id', id).order('created_at', { ascending: true });
    const commentsList = (data || []) as any[];
    const userIds = [...new Set(commentsList.map(c => c.user_id))];
    const profilesMap: Record<string, any> = {};
    if (userIds.length > 0) {
      const { data: profiles } = await supabase.from('profiles').select('id, display_name').in('id', userIds);
      (profiles || []).forEach((p: any) => { profilesMap[p.id] = p; });
    }
    setComments(prev => ({ ...prev, [id]: commentsList.map(c => ({ ...c, profile: profilesMap[c.user_id] || null })) }));
  };

  const toggleComments = async (id: string) => {
    if (!expandedComments[id]) await loadComments(id);
    setExpandedComments(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const postComment = async (id: string) => {
    if (!user || !commentText[id]?.trim()) return;
    await supabase.from('itinerary_comments').insert({ user_id: user.id, itinerary_id: id, content: commentText[id].trim() });
    setCommentText(prev => ({ ...prev, [id]: '' }));
    await loadComments(id);
    toast({ title: 'Comentário enviado!' });
  };

  return (
    <div className="min-h-screen bg-background">
      <Seo
        title="Comunidade — Roteiros compartilhados em Pernambuco | TRIPSMART"
        description="Descubra roteiros reais compartilhados pela comunidade TRIPSMART em Recife, Olinda, Noronha e mais."
        path="/#/comunidade"
        jsonLd={{ "@context": "https://schema.org", "@type": "CollectionPage", name: "Roteiros da comunidade TRIPSMART" }}
      />
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

      {/* Header banner */}
      <div className="bg-pe-red px-6 py-10">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-black tracking-display text-white">Comunidade</h1>
          <p className="text-white/70 mt-2">Roteiros compartilhados por viajantes como você</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-10">
        {loading ? (
          <p className="text-muted-foreground text-center py-12">Carregando roteiros...</p>
        ) : itineraries.length === 0 ? (
          <div className="text-center py-20">
            <Users size={48} className="mx-auto text-muted-foreground mb-4" />
            <p className="text-lg text-muted-foreground">Nenhum roteiro compartilhado ainda.</p>
            <Button onClick={() => navigate('/planejar')} className="mt-6 bg-pe-blue hover:bg-pe-blue/90 text-white border-0 rounded-full px-6 font-bold">Criar o primeiro roteiro</Button>
          </div>
        ) : (
          <div className="space-y-6">
            {itineraries.map((it, i) => (
              <motion.div key={it.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="rounded-2xl border border-border bg-card overflow-hidden" style={{ boxShadow: 'var(--card-shadow)' }}>
                {/* Colored top strip */}
                <div className="h-1.5 bg-pe-blue" />
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-9 h-9 rounded-full bg-pe-gold flex items-center justify-center text-sm font-bold text-pe-navy">
                      {(it.profile?.display_name || 'U')[0].toUpperCase()}
                    </div>
                    <div>
                      <span className="text-sm font-bold text-foreground">{it.profile?.display_name || 'Viajante'}</span>
                      <span className="text-xs text-muted-foreground block">{new Date(it.created_at).toLocaleDateString('pt-BR')}</span>
                    </div>
                  </div>

                  <h3 className="text-xl font-extrabold text-foreground">{it.title}</h3>
                  {it.description && <p className="text-sm text-muted-foreground mt-1">{it.description}</p>}

                  <div className="flex flex-wrap gap-3 mt-3">
                    <span className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full bg-pe-blue/10 text-primary"><MapPin size={12} /> {it.city_name}, PE</span>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground"><Calendar size={12} /> {it.days} dias</span>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground"><Users size={12} /> {it.people}p</span>
                    {it.month && <span className="text-xs px-2 py-1 rounded-full bg-pe-gold/10 text-pe-gold font-semibold">{monthNames[it.month - 1]}</span>}
                    <span className="text-xs font-semibold px-2 py-1 rounded-full bg-pe-red/10 text-pe-red">{it.budget_label}</span>
                  </div>

                  {it.selected_spots?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {(it.selected_spots as any[]).slice(0, 5).map((s: any) => (
                        <span key={s.id} className="text-xs px-2 py-0.5 rounded-full bg-section-blue text-primary font-semibold">{s.imageEmoji} {s.name}</span>
                      ))}
                      {it.selected_spots.length > 5 && <span className="text-xs text-muted-foreground">+{it.selected_spots.length - 5}</span>}
                    </div>
                  )}

                  <div className="flex items-center gap-1 mt-3">
                    {[1, 2, 3, 4, 5].map(score => (
                      <button key={score} onClick={() => rateItinerary(it.id, score)}>
                        <Star size={18} className={`transition-colors ${(ratings[it.id] || 0) >= score ? 'text-pe-gold fill-pe-gold' : 'text-muted-foreground'}`} />
                      </button>
                    ))}
                    {it.rating_avg > 0 && <span className="text-xs text-muted-foreground ml-2">{Number(it.rating_avg).toFixed(1)}</span>}
                  </div>
                </div>

                <div className="flex items-center justify-between px-5 py-3 border-t border-border bg-muted/30">
                  <div className="flex items-center gap-4">
                    <button onClick={() => toggleLike(it.id)} className="flex items-center gap-1 text-sm">
                      <Heart size={18} className={likes[it.id] ? 'text-pe-red fill-pe-red' : 'text-muted-foreground'} />
                      <span className="font-semibold text-foreground">{it.likes_count || 0}</span>
                    </button>
                    <button onClick={() => toggleComments(it.id)} className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MessageCircle size={18} /><span className="font-semibold">{comments[it.id]?.length || 0}</span>
                    </button>
                    <button onClick={() => toggleSave(it.id)}>
                      <Bookmark size={18} className={saves[it.id] ? 'text-pe-gold fill-pe-gold' : 'text-muted-foreground'} />
                    </button>
                  </div>
                  <Button size="sm" onClick={() => navigate(`/planejar?city=${it.city}`)} className="rounded-full text-xs font-bold gap-1 bg-pe-blue hover:bg-pe-blue/90 text-white border-0">
                    Usar roteiro →
                  </Button>
                </div>

                {expandedComments[it.id] && (
                  <div className="px-5 pb-4 border-t border-border pt-3 space-y-2">
                    {(comments[it.id] || []).map((c: any) => (
                      <div key={c.id} className="flex gap-2">
                        <div className="w-6 h-6 rounded-full bg-pe-blue/10 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">{(c.profile?.display_name || 'U')[0].toUpperCase()}</div>
                        <div><span className="text-xs font-bold text-foreground">{c.profile?.display_name || 'Viajante'}</span><p className="text-sm text-muted-foreground">{c.content}</p></div>
                      </div>
                    ))}
                    <div className="flex gap-2 mt-2">
                      <input type="text" value={commentText[it.id] || ''} onChange={e => setCommentText(prev => ({ ...prev, [it.id]: e.target.value }))} onKeyDown={e => e.key === 'Enter' && postComment(it.id)} placeholder="Escrever comentário..." className="flex-1 bg-background border border-border rounded-full px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary" />
                      <Button size="icon" onClick={() => postComment(it.id)} className="rounded-full bg-pe-blue hover:bg-pe-blue/90 border-0 h-9 w-9"><Send size={14} className="text-white" /></Button>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Community;
