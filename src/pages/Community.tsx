import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Heart, MessageCircle, Bookmark, Star, MapPin, Users, Calendar, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRequireAuth } from '@/hooks/use-require-auth';
import AppHeader from '@/components/AppHeader';
import Seo from '@/components/Seo';
import {
  useComments, useCommunityFeed, useMyReactions, usePostComment, useRateItinerary,
  useToggleLike, useToggleSave, type FeedItinerary,
} from '@/data/itineraries';
import { initials, monthName } from '@/lib/format';
import { getErrorMessage } from '@/lib/errors';

const Community = () => {
  const { loading: authLoading } = useRequireAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: itineraries = [], isLoading } = useCommunityFeed();
  const { data: reactions } = useMyReactions();

  const toggleLike = useToggleLike();
  const toggleSave = useToggleSave();
  const rateItinerary = useRateItinerary();

  const [commentText, setCommentText] = useState<Record<string, string>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const onError = (error: Error) =>
    toast({ title: 'Algo deu errado', description: getErrorMessage(error, 'Não foi possível concluir a ação. Tente novamente.'), variant: 'destructive' });

  const handleSave = (itineraryId: string, saved: boolean) => {
    toggleSave.mutate(
      { itineraryId, saved },
      {
        onSuccess: () => toast({ title: saved ? 'Roteiro removido dos salvos' : 'Roteiro salvo!' }),
        onError,
      }
    );
  };

  const handleRate = (itineraryId: string, score: number) => {
    rateItinerary.mutate(
      { itineraryId, score },
      { onSuccess: () => toast({ title: `Avaliação: ${'⭐'.repeat(score)}` }), onError }
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Seo
        title="Comunidade — Roteiros compartilhados em Pernambuco | TRIPSMART"
        description="Descubra roteiros reais compartilhados pela comunidade TRIPSMART em Recife, Olinda, Noronha e mais."
        path="/comunidade"
        jsonLd={{ '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'Roteiros da comunidade TRIPSMART' }}
      />
      <AppHeader />

      <div className="bg-pe-red px-6 py-10">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-black tracking-display text-white">Comunidade</h1>
          <p className="text-white/70 mt-2">Roteiros compartilhados por viajantes como você</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-10">
        {isLoading || authLoading ? (
          <p className="text-muted-foreground text-center py-12">Carregando roteiros...</p>
        ) : itineraries.length === 0 ? (
          <div className="text-center py-20">
            <Users size={48} className="mx-auto text-muted-foreground mb-4" />
            <p className="text-lg text-muted-foreground">Nenhum roteiro compartilhado ainda.</p>
            <Button onClick={() => navigate('/planejar')} className="mt-6 bg-pe-blue hover:bg-pe-blue/90 text-white border-0 rounded-full px-6 font-bold">
              Criar o primeiro roteiro
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {itineraries.map((it, i) => (
              <ItineraryCard
                key={it.id}
                itinerary={it}
                index={i}
                liked={!!reactions?.likes[it.id]}
                saved={!!reactions?.saves[it.id]}
                myScore={reactions?.ratings[it.id] ?? 0}
                expanded={!!expanded[it.id]}
                commentDraft={commentText[it.id] ?? ''}
                onToggleExpand={() => setExpanded((p) => ({ ...p, [it.id]: !p[it.id] }))}
                onCommentDraftChange={(value) => setCommentText((p) => ({ ...p, [it.id]: value }))}
                onClearCommentDraft={() => setCommentText((p) => ({ ...p, [it.id]: '' }))}
                onLike={() => toggleLike.mutate({ itineraryId: it.id, liked: !!reactions?.likes[it.id] }, { onError })}
                onSave={() => handleSave(it.id, !!reactions?.saves[it.id])}
                onRate={(score) => handleRate(it.id, score)}
                onUseItinerary={() => navigate(`/planejar?city=${it.city}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

interface ItineraryCardProps {
  itinerary: FeedItinerary;
  index: number;
  liked: boolean;
  saved: boolean;
  myScore: number;
  expanded: boolean;
  commentDraft: string;
  onToggleExpand: () => void;
  onCommentDraftChange: (value: string) => void;
  onClearCommentDraft: () => void;
  onLike: () => void;
  onSave: () => void;
  onRate: (score: number) => void;
  onUseItinerary: () => void;
}

const ItineraryCard = ({
  itinerary: it, index, liked, saved, myScore, expanded, commentDraft,
  onToggleExpand, onCommentDraftChange, onClearCommentDraft,
  onLike, onSave, onRate, onUseItinerary,
}: ItineraryCardProps) => {
  const { toast } = useToast();
  // Só busca comentários quando o usuário abre a seção.
  const { data: comments = [] } = useComments(it.id, expanded);
  const postComment = usePostComment();

  const submitComment = () => {
    const content = commentDraft.trim();
    if (!content) return;
    postComment.mutate(
      { itineraryId: it.id, content },
      {
        onSuccess: () => {
          onClearCommentDraft();
          toast({ title: 'Comentário enviado!' });
        },
        onError: (error: Error) =>
          toast({ title: 'Erro ao comentar', description: getErrorMessage(error, 'Não foi possível enviar seu comentário. Tente novamente.'), variant: 'destructive' }),
      }
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="rounded-2xl border border-border bg-card overflow-hidden"
      style={{ boxShadow: 'var(--card-shadow)' }}
    >
      <div className="h-1.5 bg-pe-blue" />
      <div className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-9 h-9 rounded-full bg-pe-gold flex items-center justify-center text-sm font-bold text-pe-navy">
            {initials(it.profile?.display_name)}
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
          {it.month && <span className="text-xs px-2 py-1 rounded-full bg-pe-gold/10 text-pe-gold font-semibold">{monthName(it.month)}</span>}
          <span className="text-xs font-semibold px-2 py-1 rounded-full bg-pe-red/10 text-pe-red">{it.budget_label}</span>
        </div>

        {it.selected_spots?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {it.selected_spots.slice(0, 5).map((s) => (
              <span key={s.id} className="text-xs px-2 py-0.5 rounded-full bg-section-blue text-primary font-semibold">{s.imageEmoji} {s.name}</span>
            ))}
            {it.selected_spots.length > 5 && <span className="text-xs text-muted-foreground">+{it.selected_spots.length - 5}</span>}
          </div>
        )}

        <div className="flex items-center gap-1 mt-3">
          {[1, 2, 3, 4, 5].map((score) => (
            <button key={score} onClick={() => onRate(score)} aria-label={`Avaliar com ${score} estrelas`}>
              <Star size={18} className={`transition-colors ${myScore >= score ? 'text-pe-gold fill-pe-gold' : 'text-muted-foreground'}`} />
            </button>
          ))}
          {it.rating_avg > 0 && <span className="text-xs text-muted-foreground ml-2">{Number(it.rating_avg).toFixed(1)}</span>}
        </div>
      </div>

      <div className="flex items-center justify-between px-5 py-3 border-t border-border bg-muted/30">
        <div className="flex items-center gap-4">
          <button onClick={onLike} className="flex items-center gap-1 text-sm" aria-label={liked ? 'Descurtir' : 'Curtir'}>
            <Heart size={18} className={liked ? 'text-pe-red fill-pe-red' : 'text-muted-foreground'} />
            <span className="font-semibold text-foreground">{it.likes_count || 0}</span>
          </button>
          <button onClick={onToggleExpand} className="flex items-center gap-1 text-sm text-muted-foreground" aria-label="Ver comentários">
            <MessageCircle size={18} /><span className="font-semibold">{comments.length || ''}</span>
          </button>
          <button onClick={onSave} aria-label={saved ? 'Remover dos salvos' : 'Salvar roteiro'}>
            <Bookmark size={18} className={saved ? 'text-pe-gold fill-pe-gold' : 'text-muted-foreground'} />
          </button>
        </div>
        <Button size="sm" onClick={onUseItinerary} className="rounded-full text-xs font-bold gap-1 bg-pe-blue hover:bg-pe-blue/90 text-white border-0">
          Usar roteiro →
        </Button>
      </div>

      {expanded && (
        <div className="px-5 pb-4 border-t border-border pt-3 space-y-2">
          {comments.map((c) => (
            <div key={c.id} className="flex gap-2">
              <div className="w-6 h-6 rounded-full bg-pe-blue/10 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                {initials(c.profile?.display_name)}
              </div>
              <div>
                <span className="text-xs font-bold text-foreground">{c.profile?.display_name || 'Viajante'}</span>
                <p className="text-sm text-muted-foreground">{c.content}</p>
              </div>
            </div>
          ))}
          <div className="flex gap-2 mt-2">
            <input
              type="text"
              value={commentDraft}
              onChange={(e) => onCommentDraftChange(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submitComment()}
              placeholder="Escrever comentário..."
              className="flex-1 bg-background border border-border rounded-full px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary"
            />
            <Button size="icon" onClick={submitComment} disabled={postComment.isPending} className="rounded-full bg-pe-blue hover:bg-pe-blue/90 border-0 h-9 w-9">
              <Send size={14} className="text-white" />
            </Button>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default Community;
