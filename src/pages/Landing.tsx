import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import ThemeToggle from "@/components/ThemeToggle";
import {
  MapPin,
  Sun,
  Compass,
  Star,
  ArrowRight,
  LogOut,
  History,
  Search,
  Filter,
  Users,
  Navigation,
  ChevronUp,
  Palmtree,
  Utensils,
  Waves,
  Mountain,
  User,
  Sparkles,
  Shield,
  Clock,
  TrendingUp,
} from "lucide-react";
import { pernambucoCities, spotsByCity, categoryLabels, pernambucoImages } from "@/data/mockData";
import heroPernambuco from "@/assets/hero-pernambuco.jpg";
import Seo from "@/components/Seo";
import { siteUrl } from "@/lib/site";
import { usePlannerProgress } from "@/data/plannerProgress";

const featuredDestinations = [
  { name: "Recife", cityId: "recife", emoji: "🏙️", imageUrl: pernambucoImages.recife, tag: "Capital", color: "bg-pe-blue", desc: "Marco Zero, Brennand e praias urbanas" },
  { name: "Fernando de Noronha", cityId: "noronha", emoji: "🐢", imageUrl: pernambucoImages.noronha, tag: "Paraíso", color: "bg-pe-red", desc: "As praias mais bonitas do Brasil" },
  { name: "Porto de Galinhas", cityId: "porto-galinhas", emoji: "🏖️", imageUrl: pernambucoImages["porto-galinhas"], tag: "Praias", color: "bg-pe-gold", desc: "Piscinas naturais e jangadas" },
  { name: "Olinda", cityId: "olinda", emoji: "🎭", imageUrl: pernambucoImages.olinda, tag: "Cultura", color: "bg-pe-navy", desc: "Ladeiras históricas e carnaval" },
  { name: "Caruaru", cityId: "caruaru", emoji: "🎶", imageUrl: pernambucoImages.caruaru, tag: "Forró", color: "bg-pe-red", desc: "Feira, São João e Alto do Moura" },
  { name: "Gravatá", cityId: "gravata", emoji: "🌄", imageUrl: pernambucoImages.gravata, tag: "Aventura", color: "bg-pe-blue", desc: "Trilhas e rapel na serra" },
];

const travelTips = [
  {
    icon: Sun,
    title: "Melhor época",
    desc: "De setembro a março para praias. Junho para o São João de Caruaru.",
    accent: "bg-pe-gold text-pe-navy",
  },
  {
    icon: Star,
    title: "Noronha",
    desc: "Reserve com antecedência. Limite de visitantes e taxa de preservação.",
    accent: "bg-pe-blue text-primary-foreground",
  },
  {
    icon: Compass,
    title: "Gastronomia",
    desc: "Experimente tapioca, bolo de rolo e caldinho nas praias.",
    accent: "bg-pe-red text-accent-foreground",
  },
];

const Landing = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [cityFilter, setCityFilter] = useState("");
  const [searchSpot, setSearchSpot] = useState("");
  const [showScrollTop, setShowScrollTop] = useState(false);
  // O rascunho vem do banco (planner_progress), não de sessionStorage: assim
  // o aviso "retomar plano" aparece mesmo depois de logout/login em outra
  // sessão ou dispositivo.
  const { data: savedProgress } = usePlannerProgress();
  const hasSavedPlan = !!savedProgress;

  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 600);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const goToPlanner = (cityId?: string) => {
    if (!user) {
      navigate("/auth");
      return;
    }
    navigate(cityId ? `/planejar?city=${cityId}` : "/planejar");
  };

  const allSpots = useMemo(() => {
    const spots: { spot: (typeof spotsByCity)["recife"][0]; cityId: string; cityName: string }[] = [];
    const citiesToSearch = cityFilter ? pernambucoCities.filter((c) => c.id === cityFilter) : pernambucoCities;
    citiesToSearch.forEach((city) => {
      (spotsByCity[city.id] || []).forEach((spot) => {
        if (!searchSpot || spot.name.toLowerCase().includes(searchSpot.toLowerCase())) {
          spots.push({ spot, cityId: city.id, cityName: city.name });
        }
      });
    });
    return spots;
  }, [cityFilter, searchSpot]);

  return (
    <div className="min-h-screen bg-background">
      <Seo
        title="TRIPSMART — Roteiros inteligentes em Pernambuco com IA"
        description="Planeje viagens por Recife, Olinda, Noronha, Porto de Galinhas e Caruaru com roteiros personalizados gerados por IA."
        path="/"
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: "TRIPSMART",
            url: siteUrl("/"),
            description: "Roteiros inteligentes em Pernambuco com IA.",
          },
          {
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "TRIPSMART",
            url: siteUrl("/"),
          },
        ]}
      />
      {/* Nav — Navy bar */}
      <nav className="sticky top-0 z-50 bg-pe-navy border-b border-pe-blue/20">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <button
            onClick={() => {
              window.scrollTo({ top: 0, behavior: "smooth" });
              navigate("/");
            }}
            className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
          >
            <div className="w-10 h-10 rounded-xl bg-pe-gold flex items-center justify-center">
              <Navigation size={20} className="text-pe-navy" />
            </div>
            <span className="text-xl font-black tracking-tight text-white">
              TRIP<span className="text-pe-gold">SMART</span>
            </span>
          </button>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {user ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/historico")}
                  className="gap-1.5 text-xs font-bold text-white/80 hover:text-white hover:bg-white/10"
                >
                  <History size={14} /> Histórico
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/comunidade")}
                  className="gap-1.5 text-xs font-bold text-white/80 hover:text-white hover:bg-white/10"
                >
                  <Users size={14} /> Comunidade
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/perfil")}
                  className="gap-1.5 text-xs font-bold text-white/80 hover:text-white hover:bg-white/10"
                >
                  <User size={14} /> Perfil
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={signOut}
                  className="gap-1.5 text-xs font-bold text-white/80 hover:text-white hover:bg-white/10"
                >
                  <LogOut size={14} /> Sair
                </Button>
                <Button
                  onClick={() => goToPlanner()}
                  className="bg-pe-gold hover:bg-pe-gold/90 text-pe-navy border-0 rounded-full px-5 h-9 text-sm font-bold gap-1.5"
                >
                  <Compass size={14} /> Planejar
                </Button>
              </>
            ) : (
              <Button
                onClick={() => navigate("/auth")}
                className="bg-pe-gold hover:bg-pe-gold/90 text-pe-navy border-0 rounded-full px-6 font-bold gap-2"
              >
                Entrar <ArrowRight size={16} />
              </Button>
            )}
          </div>
        </div>
      </nav>

      {/* Resume banner */}
      {user && hasSavedPlan && (
        <div className="bg-pe-gold/90 px-4 md:px-6 py-3">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <p className="text-pe-navy font-bold text-sm">📋 Você tem um planejamento em andamento</p>
            <Button
              onClick={() => navigate("/planejar")}
              size="sm"
              className="bg-pe-navy text-white hover:bg-pe-navy/90 rounded-full text-xs font-bold gap-1.5"
            >
              <Compass size={14} /> Continuar planejamento
            </Button>
          </div>
        </div>
      )}

      {/* Hero — Background image */}
      <section className="relative overflow-hidden">
        <img src={heroPernambuco} alt="Vista aérea de Pernambuco" className="absolute inset-0 w-full h-full object-cover" width={1920} height={800} />
        <div className="absolute inset-0 bg-pe-navy/60" />
        <div className="relative max-w-7xl mx-auto px-6 py-24 md:py-36 flex flex-col lg:flex-row items-center gap-12">
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="flex-1 text-left"
          >
            <span className="inline-block px-4 py-1.5 rounded-full bg-pe-gold text-pe-navy text-sm font-bold mb-6">
              ✨ Explore Pernambuco com IA
            </span>
            <h1 className="text-5xl md:text-7xl font-black tracking-display text-white leading-[1.05]">
              Planeje sua
              <br />
              viagem <span className="text-pe-gold">inteligente</span>
            </h1>
            <p className="text-lg md:text-xl text-white/75 mt-6 max-w-xl leading-relaxed">
              Roteiros personalizados com IA para cidades pernambucanas. Pontos turísticos, trilhas, praias, hospedagem
              e rotas — tudo em um só lugar.
            </p>
            <div className="flex flex-wrap gap-4 mt-10">
              <Button
                onClick={() => goToPlanner()}
                className="bg-pe-gold hover:bg-pe-gold/90 text-pe-navy border-0 rounded-full px-10 h-14 text-lg font-bold gap-2 shadow-lg"
              >
                <Compass size={22} /> Começar a planejar
              </Button>
              <Button
                onClick={() => document.getElementById("destinos")?.scrollIntoView({ behavior: "smooth" })}
                className="bg-white/20 hover:bg-white/30 text-white border-0 rounded-full px-8 h-14 text-lg font-bold gap-2 shadow-lg backdrop-blur-sm"
              >
                Ver destinos
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats — Gold bar */}
      <section className="bg-pe-gold">
        <div className="max-w-7xl mx-auto px-6 py-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: Palmtree, title: "12 cidades", desc: "De Noronha ao sertão" },
            { icon: Waves, title: "50+ atividades", desc: "Praias, trilhas e cultura" },
            { icon: Utensils, title: "Gastronomia", desc: "Sabores pernambucanos" },
            { icon: Mountain, title: "Aventura", desc: "Rapel, surf e mergulho" },
          ].map((h, i) => (
            <motion.div
              key={h.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="flex items-center gap-3 p-3 rounded-xl bg-pe-navy/10"
            >
              <div className="w-10 h-10 rounded-lg bg-pe-navy flex items-center justify-center flex-shrink-0">
                <h.icon size={18} className="text-pe-gold" />
              </div>
              <div>
                <h3 className="font-bold text-pe-navy text-sm">{h.title}</h3>
                <p className="text-xs text-pe-navy/70">{h.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Featured Destinations */}
      <section id="destinos" className="py-20 px-6 bg-background">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-pe-blue flex items-center justify-center">
              <MapPin size={20} className="text-white" />
            </div>
            <h2 className="text-3xl md:text-4xl font-black tracking-display text-foreground">Destinos em destaque</h2>
          </div>
          <p className="text-muted-foreground mb-10 ml-[52px]">Selecione um destino para começar seu planejamento</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {featuredDestinations.map((dest, i) => (
              <motion.button
                key={dest.cityId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08, duration: 0.5 }}
                whileHover={{ y: -8, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => goToPlanner(dest.cityId)}
                className="group relative rounded-2xl overflow-hidden border border-border bg-card cursor-pointer hover:shadow-xl transition-all text-left"
                style={{ boxShadow: "var(--card-shadow)" }}
              >
                {dest.imageUrl ? (
                  <img src={dest.imageUrl} alt={dest.name} loading="lazy" className="h-40 md:h-48 w-full object-cover" />
                ) : (
                  <div className={`h-40 md:h-48 ${dest.color} flex items-center justify-center text-7xl md:text-8xl`}>
                    {dest.emoji}
                  </div>
                )}
                <div className="p-5">
                  <span
                    className={`text-[10px] font-black uppercase tracking-[0.2em] ${
                      dest.color === "bg-pe-red"
                        ? "text-accent"
                        : dest.color === "bg-pe-gold"
                          ? "text-pe-gold"
                          : "text-primary"
                    }`}
                  >
                    {dest.tag}
                  </span>
                  <h3 className="text-xl font-bold text-card-foreground mt-1">{dest.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{dest.desc}</p>
                </div>
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-pe-gold text-pe-navy">Planejar →</span>
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      </section>

      {/* Tourist Spots — Red tinted section */}
      <section className="py-20 px-6 bg-section-red border-y border-pe-red/10">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-pe-red flex items-center justify-center">
              <Star size={20} className="text-white" />
            </div>
            <h2 className="text-3xl md:text-4xl font-black tracking-display text-foreground">
              Atividades em Pernambuco
            </h2>
          </div>
          <p className="text-muted-foreground mb-8 ml-[52px]">Descubra o que fazer em cada cidade</p>

          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            <div className="flex items-center gap-2 px-4 py-3 bg-card rounded-2xl border border-border flex-1 max-w-md">
              <Search size={18} className="text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar atividade..."
                value={searchSpot}
                onChange={(e) => setSearchSpot(e.target.value)}
                className="bg-transparent outline-none text-sm text-foreground w-full placeholder:text-muted-foreground"
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Filter size={16} className="text-muted-foreground" />
              <button
                onClick={() => setCityFilter("")}
                className={`text-xs font-bold px-3 py-2 rounded-full transition-all ${!cityFilter ? "bg-pe-red text-white" : "bg-card border border-border text-muted-foreground hover:border-pe-red/40"}`}
              >
                Todas
              </button>
              {pernambucoCities.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCityFilter(c.id === cityFilter ? "" : c.id)}
                  className={`text-xs font-bold px-3 py-2 rounded-full transition-all ${cityFilter === c.id ? "bg-pe-red text-white" : "bg-card border border-border text-muted-foreground hover:border-pe-red/40"}`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {allSpots.slice(0, 16).map(({ spot, cityId, cityName }, i) => (
              <motion.button
                key={`${cityId}-${spot.id}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04, duration: 0.4 }}
                whileHover={{ y: -4 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate(`/atividade/${cityId}/${spot.id}`)}
                className="rounded-2xl border border-border bg-card text-left overflow-hidden hover:border-pe-red/40 transition-all"
                style={{ boxShadow: "var(--card-shadow)" }}
              >
                {spot.imageUrl ? (
                  <img src={spot.imageUrl} alt={spot.name} className="w-full h-40 object-cover" />
                ) : (
                  <div className="w-full h-40 bg-section-blue flex items-center justify-center text-5xl">
                    {spot.imageEmoji}
                  </div>
                )}
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-card-foreground text-sm">{spot.name}</h3>
                    <span className="flex items-center gap-1 text-xs">
                      <Star size={12} className="text-pe-gold fill-pe-gold" />
                      <span className="font-bold text-foreground">{spot.rating}</span>
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{cityName}</p>
                  <div className="flex items-center justify-between mt-2.5">
                    <span className="text-xs font-semibold text-pe-red">
                      {spot.avgCostPerPerson === 0
                        ? "Gratuito"
                        : spot.avgCostPerPerson
                          ? `~R$ ${spot.avgCostPerPerson}/pessoa`
                          : ""}
                    </span>
                    {spot.category && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-pe-blue/10 text-primary">
                        {categoryLabels[spot.category]}
                      </span>
                    )}
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
          {allSpots.length > 16 && (
            <p className="text-center text-sm text-muted-foreground mt-6">
              Mostrando 16 de {allSpots.length} atividades · Use os filtros acima
            </p>
          )}
        </div>
      </section>

      {/* Why TripSmart — Blue tinted */}
      <section className="py-20 px-6 bg-section-blue">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-black tracking-display text-foreground">
              Por que usar o <span className="text-primary">TRIP</span>
              <span className="text-pe-gold">SMART</span>?
            </h2>
            <p className="text-muted-foreground mt-3 max-w-xl mx-auto">
              Tecnologia e inteligência artificial para transformar seu planejamento.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: Sparkles,
                title: "Roteiros com IA",
                desc: "A inteligência artificial cria roteiros personalizados hora a hora, considerando seu orçamento, dias e preferências.",
                color: "bg-pe-blue",
              },
              {
                icon: Shield,
                title: "Segurança",
                desc: "Indicadores de segurança por bairro e hospedagem para você viajar com tranquilidade.",
                color: "bg-pe-red",
              },
              {
                icon: TrendingUp,
                title: "Comunidade ativa",
                desc: "Compartilhe roteiros, avalie experiências e descubra dicas de outros viajantes.",
                color: "bg-pe-gold",
              },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="p-8 rounded-2xl border border-border bg-card"
                style={{ boxShadow: "var(--card-shadow)" }}
              >
                <div className={`w-14 h-14 rounded-2xl ${item.color} flex items-center justify-center mb-5`}>
                  <item.icon size={26} className="text-white" />
                </div>
                <h3 className="text-xl font-bold text-card-foreground">{item.title}</h3>
                <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Travel Tips — Gold tinted */}
      <section className="py-20 px-6 bg-section-gold border-y border-pe-gold/10">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-pe-gold flex items-center justify-center">
              <Sun size={20} className="text-pe-navy" />
            </div>
            <h2 className="text-3xl md:text-4xl font-black tracking-display text-foreground">Dicas para sua viagem</h2>
          </div>
          <p className="text-muted-foreground mb-10 ml-[52px]">Informações essenciais para aproveitar ao máximo</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {travelTips.map((tip, i) => (
              <motion.div
                key={tip.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="p-8 rounded-2xl border border-border bg-card"
                style={{ boxShadow: "var(--card-shadow)" }}
              >
                <div className={`w-12 h-12 rounded-xl ${tip.accent} flex items-center justify-center mb-4`}>
                  <tip.icon size={22} />
                </div>
                <h3 className="text-xl font-bold text-card-foreground">{tip.title}</h3>
                <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{tip.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-6 bg-background">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-black tracking-display text-foreground text-center mb-14">
            Como funciona?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              {
                step: "01",
                title: "Defina seu orçamento",
                desc: "Escolha quanto quer gastar e quantos viajantes irão.",
                color: "bg-pe-blue",
                textColor: "text-white",
              },
              {
                step: "02",
                title: "Escolha o destino",
                desc: "Selecione a cidade e as atividades que mais te interessam.",
                color: "bg-pe-red",
                textColor: "text-white",
              },
              {
                step: "03",
                title: "Monte o roteiro",
                desc: "Hospedagem, transporte e pontos turísticos sob medida.",
                color: "bg-pe-gold",
                textColor: "text-pe-navy",
              },
              {
                step: "04",
                title: "Compartilhe",
                desc: "Salve no histórico e compartilhe com a comunidade.",
                color: "bg-pe-navy",
                textColor: "text-white",
              },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`p-6 rounded-2xl ${item.color} ${item.textColor} relative overflow-hidden`}
              >
                <span className="text-6xl font-black opacity-20 absolute -top-2 -right-1">{item.step}</span>
                <div className="relative z-10">
                  <Clock size={24} className="mb-4 opacity-80" />
                  <h3 className="text-lg font-bold">{item.title}</h3>
                  <p className="text-sm mt-2 opacity-80">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      {!user && (
        <section className="py-24 px-6 bg-pe-navy">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-5xl font-black text-white tracking-display leading-tight">
              Pronto para explorar
              <br />
              <span className="text-pe-gold">Pernambuco?</span>
            </h2>
            <p className="text-white/60 mt-5 text-lg">Crie sua conta e comece a planejar a viagem dos seus sonhos.</p>
            <Button
              onClick={() => navigate("/auth")}
              className="mt-10 bg-pe-gold hover:bg-pe-gold/90 text-pe-navy rounded-full px-10 h-14 text-lg font-bold gap-2 border-0"
            >
              Começar agora <ArrowRight size={20} />
            </Button>
          </div>
        </section>
      )}

      {/* Footer — Navy */}
      <footer className="bg-pe-navy text-center py-10 px-6 space-y-3">
        <button
          onClick={() => {
            window.scrollTo({ top: 0, behavior: "smooth" });
            navigate("/");
          }}
          className="font-black text-xl hover:opacity-80 transition-opacity text-white"
        >
          TRIP<span className="text-pe-gold">SMART</span>
        </button>
        <p className="text-white/50 text-sm">Explore Pernambuco com inteligência 🏖️</p>
        <p className="text-white/30 text-xs">© {new Date().getFullYear()} TripSmart. Todos os direitos reservados.</p>
      </footer>

      {/* Scroll to top */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full bg-pe-red flex items-center justify-center shadow-lg hover:opacity-90 transition-opacity"
          >
            <ChevronUp size={24} className="text-white" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Landing;
